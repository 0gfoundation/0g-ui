/**
 * The consumer diff: what a change to the package changes for each site
 * that installs it, before any site repins.
 *
 *   pnpm consumer-diff [--base <ref>] [--head <ref>] [--only <site>] [--images all]
 *                      [--site <name>=<ref>] [--local <name>=<dir>] [--out <dir>]
 *
 * Builds the package at two refs, base (default: the merge base with
 * origin/main) and head (default: the working tree). Reads each site in
 * consumers.json from the manifest in its own repository (manifest.ts),
 * renders it from each build as the site imports it, and compares the
 * two: the header's and tab bar's markup, screenshots of each state at
 * phone and desktop widths in each of the site's themes, the gzipped JS
 * and CSS a page carries, and the package's declarations. Writes
 * report.md, the full diffs and a base, head and pixel-diff image for
 * every state that changed. It reports differences and sites it could
 * not read. It never fails on them. CI posts the report on the PR
 * (.github/workflows/consumer-diff.yml).
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";

import pixelmatch from "pixelmatch";
import { chromium, type Browser, type Page } from "playwright";
import { PNG } from "pngjs";
import { build } from "vite";

import { harnessConfig, RESOLVED } from "../vite.config.ts";
import { readConsumer, type Source } from "./manifest.ts";
import { checkConsumer, checkRegistry, isGroupEntry, type Consumer, type Registry } from "./registry.ts";

const here = fileURLToPath(new URL("../", import.meta.url));
const repo = fileURLToPath(new URL("../../../", import.meta.url));
const work = join(here, ".work");

type Side = "base" | "head";
const SIDES: Side[] = ["base", "head"];

// ---------------------------------------------------------------------------
// Processes

function run(cmd: string, args: string[], cwd: string): string {
  const result = spawnSync(cmd, args, { cwd, encoding: "utf8", env: process.env });
  if (result.status !== 0) {
    const out = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split("\n").slice(-30).join("\n");
    throw new Error(`${cmd} ${args.join(" ")} (in ${cwd}) failed:\n${out}`);
  }
  return result.stdout.trim();
}

const git = (...args: string[]) => run("git", args, repo);

/** "12.3s" since `from`, for the phase timings in the log. */
const seconds = (from: number) => `${((Date.now() - from) / 1000).toFixed(1)}s`;

/** `fn` over `items`, at most `size` at once, results in item order. */
async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(size, items.length)) }, worker));
  return out;
}

/** `git diff --no-index` of two paths under `cwd`: empty when they match. */
function diffPaths(cwd: string, a: string, b: string, extra: string[] = []): string {
  const result = spawnSync("git", ["diff", "--no-index", "--no-color", ...extra, a, b], { cwd, encoding: "utf8" });
  if (result.status !== 0 && result.status !== 1) throw new Error(`git diff failed: ${result.stderr}`);
  return result.stdout;
}

// ---------------------------------------------------------------------------
// The two builds of the package

/** What a site's install gets: the manifest, dist, and src for the CSS entry. */
function copyPackage(from: string, to: string) {
  rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });
  cpSync(join(from, "package.json"), join(to, "package.json"));
  cpSync(join(from, "dist"), join(to, "dist"), { recursive: true });
  cpSync(join(from, "src"), join(to, "src"), { recursive: true });
}

/** Builds one side and returns its package directory. `ref` null is the
 *  working tree; a ref is built in a throwaway worktree with its own
 *  install, and kept in .work until the ref changes. */
function prepareSide(side: Side, ref: string | null): string {
  const dest = join(work, "sides", side, "pkg");
  const stamp = join(work, "sides", side, "ref");
  if (ref === null) {
    run("pnpm", ["--filter", "@0gfoundation/0g-ui", "build"], repo);
    copyPackage(join(repo, "packages/0g-ui"), dest);
    rmSync(stamp, { force: true });
    return dest;
  }
  if (existsSync(stamp) && readFileSync(stamp, "utf8") === ref && existsSync(join(dest, "dist/index.js"))) {
    return dest;
  }
  const tree = join(tmpdir(), `0g-ui-${side}-${ref.slice(0, 12)}`);
  rmSync(tree, { recursive: true, force: true });
  git("worktree", "prune");
  git("worktree", "add", "--detach", tree, ref);
  try {
    run("pnpm", ["install", "--frozen-lockfile", "--filter", "@0gfoundation/0g-ui"], tree);
    run("pnpm", ["--filter", "@0gfoundation/0g-ui", "build"], tree);
    copyPackage(join(tree, "packages/0g-ui"), dest);
  } finally {
    git("worktree", "remove", "--force", tree);
  }
  writeFileSync(stamp, ref);
  return dest;
}

// ---------------------------------------------------------------------------
// One site's page, built against one side

type Sizes = { js: number; css: number };

function gzipSizes(dir: string): Sizes {
  const sizes: Sizes = { js: 0, css: 0 };
  const assets = join(dir, "assets");
  for (const file of readdirSync(assets)) {
    const bytes = gzipSync(readFileSync(join(assets, file)), { level: 9 }).length;
    if (file.endsWith(".js")) sizes.js += bytes;
    if (file.endsWith(".css")) sizes.css += bytes;
  }
  return sizes;
}

/** The site's stylesheet: its CSS entry from this side, then its own CSS. */
function hostCss(consumer: Consumer, pkg: string): string {
  const entry =
    consumer.css === "tailwind.css"
      ? [
          // A Tailwind host: its own import (no sources of ours to scan,
          // the page is plain CSS), then the package's source entry, whose
          // @source reaches this side's dist.
          `@import "tailwindcss" source(none);`,
          `@import "${join(pkg, "src/tailwind.css")}";`,
        ]
      : [`@import "${join(pkg, "dist/shell.css")}";`];
  return [...entry, ...(consumer.hostCss ?? [])].join("\n") + "\n";
}

async function buildPage(consumer: Consumer, side: Side, pkg: string): Promise<Sizes> {
  const slug = `${side}-${consumer.name}`;
  const css = join(work, "css", `${slug}.css`);
  mkdirSync(dirname(css), { recursive: true });
  writeFileSync(css, hostCss(consumer, pkg));
  const outDir = join(work, "pages", slug);
  await build(
    harnessConfig({
      shell: join(pkg, "dist/index.js"),
      theme: join(pkg, "dist/theme/index.js"),
      hostCss: css,
      base: `/${slug}/`,
      outDir,
    }),
  );
  return gzipSizes(outDir);
}

// ---------------------------------------------------------------------------
// Serving the pages

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

function serve(root: string): Promise<{ origin: string; server: Server }> {
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    let file = join(root, pathname);
    if (!file.startsWith(root + sep) && file !== root) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ origin: `http://127.0.0.1:${port}`, server });
    });
  });
}

// ---------------------------------------------------------------------------
// States

const VIEWPORTS = {
  phone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  desktop: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
  wide: { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false },
} as const;

type Action =
  | { kind: "none" }
  | { kind: "scroll" }
  | { kind: "group"; label: string }
  | { kind: "menu" }
  | { kind: "menuGroup"; label: string };

type State = {
  id: string;
  viewport: keyof typeof VIEWPORTS;
  theme: "light" | "dark";
  action: Action;
  /** Also read the shell's markup here: the header and tab bar, or the open menu. */
  markup?: "shell" | "menu";
};

/**
 * Every state worth a picture for a site: phone at the top and after a
 * scroll (the header gone, the tab bar compact), desktop, the wide bar
 * where it grows, each group's panel, the phone menu and each of its
 * groups. In each theme the site renders.
 */
function statesFor(consumer: Consumer): State[] {
  const states: State[] = [];
  const groups = consumer.header.items.filter(isGroupEntry).map((g) => g.label);
  consumer.themes.forEach((theme, i) => {
    const t = consumer.themes.length > 1 ? `${theme}, ` : "";
    states.push({ id: `${t}desktop`, viewport: "desktop", theme, action: { kind: "none" }, markup: i === 0 ? "shell" : undefined });
    if (consumer.header.width === "grow") states.push({ id: `${t}wide`, viewport: "wide", theme, action: { kind: "none" } });
    for (const label of groups) {
      states.push({ id: `${t}desktop, ${label} open`, viewport: "desktop", theme, action: { kind: "group", label } });
    }
    states.push({ id: `${t}phone`, viewport: "phone", theme, action: { kind: "none" } });
    states.push({ id: `${t}phone, scrolled`, viewport: "phone", theme, action: { kind: "scroll" } });
    if (consumer.header.menu) {
      states.push({ id: `${t}phone, menu`, viewport: "phone", theme, action: { kind: "menu" }, markup: i === 0 ? "menu" : undefined });
      for (const label of groups) {
        states.push({ id: `${t}phone, menu, ${label}`, viewport: "phone", theme, action: { kind: "menuGroup", label } });
      }
    }
  });
  return states;
}

/** Frames in a row with nothing moving before a state counts as settled:
 *  about 200ms, past the driver's 150ms rest timer. */
const STILL_FRAMES = 12;

/**
 * Waits until the page is still: no running animation or transition, and
 * the scroll position and every value the shell's driver writes on <html>
 * unchanged for STILL_FRAMES frames. The driver's timed stage and the
 * header's slide are both motion, so a state is shot once they end, not
 * after a fixed pause. Gives up after three seconds and shoots anyway.
 *
 * Plain source, not a function: tsx compiles with keepNames, which wraps
 * inner functions in a `__name` helper the page does not have.
 */
const SETTLE = `new Promise((resolve) => {
  const root = document.documentElement;
  const read = () => [
    root.style.getPropertyValue("--shell-nav"),
    root.style.getPropertyValue("--shell-t"),
    root.style.getPropertyValue("--shell-fade"),
    root.dataset.shellMotion || "",
    root.dataset.shellPin || "",
    String(window.scrollY),
  ].join("|");
  const started = performance.now();
  let last = read();
  let calm = 0;
  const tick = () => {
    const now = read();
    const moving = document.getAnimations().some((a) => a.playState === "running");
    calm = now === last && !moving ? calm + 1 : 0;
    last = now;
    if (calm >= ${STILL_FRAMES} || performance.now() - started > 3000) resolve();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})`;

async function settle(page: Page) {
  await page.evaluate(SETTLE);
}

/** Clicks a control the rendered header has, and fails at once when it has
 *  none (a group on a build without groups), rather than after a timeout. */
async function click(target: ReturnType<Page["locator"]>) {
  if ((await target.count()) === 0) throw new Error("not in this build");
  await target.click({ timeout: 3000 });
}

async function act(page: Page, action: Action, consumer: Consumer) {
  const timeout = 3000;
  switch (action.kind) {
    case "none":
      return;
    case "scroll":
      // A finger's worth of scroll in steps about a frame apart, so the
      // driver sees a gesture. settle() then waits out its timers.
      for (let i = 0; i < 12; i++) {
        await page.evaluate(() => window.scrollBy(0, 80));
        await page.waitForTimeout(20);
      }
      return;
    case "group":
      await click(page.locator("[data-shell-header] nav").getByRole("button", { name: action.label, exact: true }));
      return;
    case "menu":
    case "menuGroup": {
      const label = consumer.header.menu?.label ?? "Menu";
      await click(page.getByRole("button", { name: label, exact: true }));
      if (action.kind === "menu") return;
      const group = page.getByRole("dialog").getByRole("button", { name: action.label, exact: true });
      await group.waitFor({ timeout });
      // The active group starts open; a click would close it.
      if ((await group.getAttribute("aria-expanded")) !== "true") await group.click({ timeout });
      return;
    }
  }
}

type Capture = { png?: Buffer; markup?: string; unreachable?: string };

async function capture(browser: Browser, url: string, state: State, consumer: Consumer): Promise<Capture> {
  const vp = VIEWPORTS[state.viewport];
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor,
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "load" });
    await page.waitForSelector("[data-shell-header]", { timeout: 10_000 });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    try {
      await act(page, state.action, consumer);
    } catch (error) {
      return { unreachable: (error as Error).message.split("\n")[0] };
    }
    await settle(page);
    const png = await page.screenshot({ animations: "disabled", caret: "hide" });
    let markup: string | undefined;
    if (state.markup === "shell") {
      markup = await page.evaluate(() =>
        [document.querySelector("[data-shell-header]")?.outerHTML, document.querySelector(".shell-nav")?.outerHTML]
          .filter(Boolean)
          .join("\n"),
      );
    } else if (state.markup === "menu") {
      markup = await page.evaluate(() => document.querySelector('[role="dialog"]')?.outerHTML ?? "");
    }
    return { png, markup };
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------------------
// Comparing

function pixelDiff(a: Buffer, b: Buffer): { pixels: number; image?: Buffer } {
  const A = PNG.sync.read(a);
  const B = PNG.sync.read(b);
  if (A.width !== B.width || A.height !== B.height) return { pixels: -1 };
  const out = new PNG({ width: A.width, height: A.height });
  const pixels = pixelmatch(A.data, B.data, out.data, A.width, A.height, { threshold: 0.1 });
  return { pixels, image: pixels > 0 ? PNG.sync.write(out) : undefined };
}

const pretty = (html: string) => html.replace(/></g, ">\n<") + "\n";
/** "+3 −1": lines added and removed, headers excluded. */
function lineCounts(diff: string): string {
  const lines = diff.split("\n").filter((l) => !/^(\+\+\+|---) /.test(l));
  const added = lines.filter((l) => l.startsWith("+")).length;
  const removed = lines.filter((l) => l.startsWith("-")).length;
  return added + removed === 0 ? "identical" : `+${added} −${removed}`;
}
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type StateResult = { id: string; pixels: number | null; note?: string; absent?: boolean };
type SiteResult = {
  consumer: Consumer;
  states: StateResult[];
  markupDiff: string;
  sizes: Record<Side, Sizes>;
  /** What the head build cannot give the site's manifest. */
  problems: string[];
};

// ---------------------------------------------------------------------------
// The report

function kb(delta: number): string {
  if (delta === 0) return "no change";
  const sign = delta > 0 ? "+" : "−";
  const abs = Math.abs(delta);
  return abs < 1024 ? `${sign}${abs} B` : `${sign}${(abs / 1024).toFixed(1)} KB`;
}

/** At most `max` lines in a code block; the whole diff is in the artifact. */
function clip(text: string, max: number): string {
  const lines = text.trimEnd().split("\n");
  if (lines.length <= max) return lines.join("\n");
  return [...lines.slice(0, max), `… ${lines.length - max} more lines in the artifact`].join("\n");
}

/** A PR comment holds 65,536 characters. */
const COMMENT_LIMIT = 60_000;

/** The report, with its diffs shortened until it fits a comment. */
function fittedReport(o: Parameters<typeof report>[0]): string {
  for (const clipAt of [250, 80, 20]) {
    const md = report({ ...o, clipAt });
    if (md.length <= COMMENT_LIMIT) return md;
  }
  return report({ ...o, clipAt: 0 });
}

function report(o: {
  base: string;
  head: string;
  sites: SiteResult[];
  unread: { name: string; reason: string }[];
  dtsDiff: string;
  artifact?: string;
  clipAt?: number;
}): string {
  const clipAt = o.clipAt ?? 250;
  const out: string[] = ["<!-- 0g-ui-consumer-diff -->", "### What this changes for each site", ""];
  const unchanged = (s: SiteResult) =>
    s.problems.length === 0 &&
    s.markupDiff === "" &&
    s.states.every((st) => st.pixels === 0) &&
    s.sizes.base.js === s.sizes.head.js &&
    s.sizes.base.css === s.sizes.head.css;

  out.push(
    `Each site in \`consumers.json\`, read from its own manifest and rendered from \`${o.base}\` and from \`${o.head}\` ` +
      "the way it imports the package. A site sees these changes when it repins to a release that has them.",
    "",
  );
  if (o.unread.length > 0) {
    out.push(o.sites.length === 0 ? "No site could be read:" : "Not read, so not compared:", "");
    for (const u of o.unread) out.push(`- \`${u.name}\`: ${u.reason}`);
    out.push("");
  }
  if (o.sites.length === 0) return out.join("\n") + "\n";
  if (o.sites.every(unchanged) && o.dtsDiff === "") {
    const all = o.sites.length === 1 ? `\`${o.sites[0].consumer.name}\`` : `all ${o.sites.length} sites read`;
    out.push(`No site sees a change. Markup, screenshots, bytes and declarations are identical for ${all}.`);
    return out.join("\n") + "\n";
  }
  for (const s of o.sites.filter((x) => x.problems.length > 0)) {
    out.push(`**\`${s.consumer.name}\` asks for what this build does not have:**`, "");
    for (const p of s.problems) out.push(`- ${p}`);
    out.push("");
  }

  out.push("| Site | Markup | Screenshots | JS | CSS |", "| --- | --- | --- | --- | --- |");
  for (const s of o.sites) {
    const differ = s.states.filter((st) => st.pixels !== 0).length;
    const shots = differ === 0 ? `none of ${s.states.length} differ` : `${differ} of ${s.states.length} differ`;
    out.push(
      `| \`${s.consumer.name}\` | ${lineCounts(s.markupDiff)} | ${shots} | ` +
        `${kb(s.sizes.head.js - s.sizes.base.js)} | ${kb(s.sizes.head.css - s.sizes.base.css)} |`,
    );
  }
  out.push("", "JS and CSS are the change in the gzipped page a site ships, the shell's share of it.", "");

  for (const s of o.sites) {
    const changed = s.states.filter((st) => st.pixels !== 0);
    if (changed.length > 0) {
      out.push(`<details><summary><code>${s.consumer.name}</code>: screenshots that differ</summary>`, "");
      out.push("| State | Pixels |", "| --- | --- |");
      for (const st of changed) {
        const what = st.note ?? (st.pixels === -1 ? "size changed" : st.pixels!.toLocaleString("en-GB"));
        out.push(`| ${st.id} | ${what} |`);
      }
      out.push("", "</details>", "");
    }
    if (s.markupDiff) {
      out.push(`<details><summary><code>${s.consumer.name}</code>: markup</summary>`, "", "```diff", clip(s.markupDiff, clipAt), "```", "", "</details>", "");
    }
  }
  if (o.dtsDiff) {
    out.push(
      `<details><summary>Declarations: ${o.dtsDiff.split("\n").filter((l) => l.startsWith("diff --git")).length} files change</summary>`,
      "",
      "```diff",
      clip(o.dtsDiff, clipAt),
      "```",
      "",
      "</details>",
      "",
    );
  }
  out.push(
    o.artifact
      ? `Base, head and pixel-diff images of every state that changed, and the full diffs, are in the run's [consumer-diff artifact](${o.artifact}).`
      : "Base, head and pixel-diff images of every state that changed, and the full diffs, are next to this report.",
  );
  return out.join("\n") + "\n";
}

// ---------------------------------------------------------------------------

async function main() {
  const { values } = parseArgs({
    options: {
      base: { type: "string" },
      head: { type: "string" },
      only: { type: "string" },
      // "all" keeps every state's picture, for checking a site's manifest.
      images: { type: "string", default: "changed" },
      // What the report calls the head: CI builds a PR's merge result and
      // names it by the PR's own head commit.
      "head-label": { type: "string" },
      // `name=ref`: read a site's manifest from another branch, to see a
      // site change that has not merged. Repeatable.
      site: { type: "string", multiple: true },
      // `name=dir`: read it from a local checkout instead of GitHub.
      local: { type: "string", multiple: true },
      // Pages shot at once. Four keeps a CI runner's two cores busy
      // without starving the frames settle() counts.
      workers: { type: "string", default: "4" },
      out: { type: "string" },
    },
  });
  const pairs = (list: string[] | undefined) =>
    new Map((list ?? []).map((p) => [p.slice(0, p.indexOf("=")), p.slice(p.indexOf("=") + 1)] as const));
  const refs = pairs(values.site);
  const dirs = pairs(values.local);
  const baseRef = git("rev-parse", "--verify", `${values.base ?? git("merge-base", "origin/main", "HEAD")}^{commit}`);
  const headRef = values.head ? git("rev-parse", "--verify", `${values.head}^{commit}`) : null;
  const dirty = headRef === null && git("status", "--porcelain", "--", "packages/0g-ui") !== "";
  const headLabel =
    values["head-label"] ??
    (headRef ? headRef.slice(0, 7) : `${git("rev-parse", "--short=7", "HEAD")}${dirty ? " + working tree" : ""}`);
  const outDir = values.out ?? join(work, "report");
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  console.log(`consumer-diff: base ${baseRef.slice(0, 7)}, head ${headLabel}`);
  const preparing = Date.now();
  const pkgs: Record<Side, string> = {
    base: prepareSide("base", baseRef),
    head: prepareSide("head", headRef),
  };
  console.log(`consumer-diff: ${seconds(preparing)} to build both sides of the package`);

  const registry = JSON.parse(readFileSync(join(repo, "consumers.json"), "utf8")) as Registry;
  const registryProblems = checkRegistry(registry);
  if (registryProblems.length > 0) throw new Error(registryProblems.join("\n"));
  const entries = registry.consumers.filter((c) => !values.only || c.name === values.only);
  if (entries.length === 0) throw new Error(`no consumer named ${values.only}`);

  // Each site's manifest, from its repository. A site that cannot be read
  // (no manifest yet, no token) is reported, and the rest still run.
  const consumers: Consumer[] = [];
  const unread: { name: string; reason: string }[] = [];
  for (const entry of entries) {
    const dir = dirs.get(entry.name);
    const source: Source = dir ? { kind: "local", dir } : { kind: "github", ref: refs.get(entry.name) ?? entry.ref };
    try {
      consumers.push(readConsumer(entry, source));
    } catch (error) {
      unread.push({ name: entry.name, reason: (error as Error).message.split("\n")[0] });
      console.log(`  ${entry.name}: not read: ${(error as Error).message.split("\n")[0]}`);
    }
  }
  mkdirSync(dirname(RESOLVED), { recursive: true });
  writeFileSync(RESOLVED, JSON.stringify({ consumers }, null, 2));
  const headExports = (await import(pathToFileURL(join(pkgs.head, "dist/index.js")).href)) as Record<string, unknown>;

  const building = Date.now();
  const sizes = new Map<string, Record<Side, Sizes>>();
  for (const c of consumers) {
    const entry = {} as Record<Side, Sizes>;
    for (const side of SIDES) entry[side] = await buildPage(c, side, pkgs[side]);
    sizes.set(c.name, entry);
  }
  console.log(`consumer-diff: ${seconds(building)} to build ${consumers.length * 2} site pages`);

  const { origin, server } = await serve(join(work, "pages"));
  const urlFor = (side: Side, c: Consumer, state: State) =>
    `${origin}/${side}-${c.name}/?consumer=${encodeURIComponent(c.name)}&theme=${state.theme}`;
  let browser: Browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    server.close();
    throw new Error(
      `Chromium did not start. Install it once with\n  pnpm --filter @0gfoundation/0g-ui-consumer-diff exec playwright install chromium\n${(error as Error).message}`,
      { cause: error },
    );
  }

  /** One state of one site, shot on both sides and compared. */
  const compareState = async (c: Consumer, state: State) => {
    const shots = {} as Record<Side, Capture>;
    for (const side of SIDES) shots[side] = await capture(browser, urlFor(side, c, state), state, c);
    const stem = join(outDir, c.name, slugify(state.id));
    let basePng = shots.base.png;
    let headPng = shots.head.png;
    let result: StateResult;
    // A state neither build reaches (a group on a package without
    // groups) is no change, and says so in the log.
    if (!basePng && !headPng) result = { id: state.id, pixels: 0, absent: true };
    else if (!basePng) result = { id: state.id, pixels: null, note: "new on head" };
    else if (!headPng) result = { id: state.id, pixels: null, note: `gone on head (${shots.head.unreachable})` };
    else {
      let d = pixelDiff(basePng, headPng);
      // Rasterising a transformed glyph mid-frame can differ by a pixel
      // between two identical pages. A difference is shot again once,
      // both sides, and the smaller one stands: noise does not repeat, a
      // change does.
      if (d.pixels !== 0) {
        const retakeBase = (await capture(browser, urlFor("base", c, state), state, c)).png;
        const retakeHead = (await capture(browser, urlFor("head", c, state), state, c)).png;
        if (retakeBase && retakeHead) {
          const retake = pixelDiff(retakeBase, retakeHead);
          if (retake.pixels !== -1 && (d.pixels === -1 || retake.pixels < d.pixels)) {
            d = retake;
            basePng = retakeBase;
            headPng = retakeHead;
          }
        }
      }
      result = { id: state.id, pixels: d.pixels };
      if (d.pixels !== 0) {
        writeFileSync(`${stem}.base.png`, basePng);
        writeFileSync(`${stem}.head.png`, headPng);
        if (d.image) writeFileSync(`${stem}.diff.png`, d.image);
      } else if (values.images === "all") {
        writeFileSync(`${stem}.png`, headPng);
      }
    }
    if (result.note) {
      if (basePng) writeFileSync(`${stem}.base.png`, basePng);
      if (headPng) writeFileSync(`${stem}.head.png`, headPng);
    }
    return { c, state, result, shots };
  };

  const sites: SiteResult[] = [];
  const capturing = Date.now();
  try {
    for (const c of consumers) mkdirSync(join(outDir, c.name), { recursive: true });
    // Every state of every site, a few pages at a time: each is its own
    // browser context, so nothing carries between them.
    const jobs = consumers.flatMap((c) => statesFor(c).map((state) => ({ c, state })));
    const done = await pool(jobs, Number(values.workers), (job) => compareState(job.c, job.state));

    for (const c of consumers) {
      const siteDir = join(outDir, c.name);
      const mine = done.filter((d) => d.c === c);
      const markup: Record<Side, string[]> = { base: [], head: [] };
      for (const { state, result, shots } of mine) {
        const said = result.note ?? (result.absent ? "absent on both" : result.pixels === 0 ? "same" : `${result.pixels} px`);
        console.log(`  ${c.name}: ${state.id}: ${said}`);
        if (!state.markup) continue;
        for (const side of SIDES) {
          markup[side].push(`<!-- ${state.id} -->`, pretty(shots[side].markup ?? `(${shots[side].unreachable ?? "absent"})`));
        }
      }
      for (const side of SIDES) writeFileSync(join(siteDir, `markup.${side}.html`), markup[side].join("\n"));
      const markupDiff = diffPaths(siteDir, `markup.base.html`, `markup.head.html`, ["-U2"]);
      if (markupDiff) writeFileSync(join(siteDir, "markup.diff"), markupDiff);
      sites.push({
        consumer: c,
        states: mine.map((d) => d.result),
        markupDiff,
        sizes: sizes.get(c.name)!,
        problems: checkConsumer(c, headExports),
      });
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`consumer-diff: ${seconds(capturing)} to shoot and compare every state`);

  // The declarations each side ships, compared as files.
  const dts = join(work, "dts");
  rmSync(dts, { recursive: true, force: true });
  for (const side of SIDES) {
    const from = join(pkgs[side], "dist");
    for (const file of readdirSync(from, { recursive: true }) as string[]) {
      if (!file.endsWith(".d.ts")) continue;
      const to = join(dts, side, file);
      mkdirSync(dirname(to), { recursive: true });
      cpSync(join(from, file), to);
    }
  }
  const dtsDiff = diffPaths(dts, "base", "head");
  if (dtsDiff) writeFileSync(join(outDir, "declarations.diff"), dtsDiff);

  const run = process.env.GITHUB_RUN_ID;
  const artifact = run
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${run}`
    : undefined;
  const md = fittedReport({ base: baseRef.slice(0, 7), head: headLabel, sites, unread, dtsDiff, artifact });
  writeFileSync(join(outDir, "report.md"), md);
  console.log(`\n${md}\nconsumer-diff: report at ${join(outDir, "report.md")}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
