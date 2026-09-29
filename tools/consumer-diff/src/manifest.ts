import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";

import {
  checkManifest,
  resolveManifest,
  type Consumer,
  type ConsumerEntry,
  type Manifest,
} from "./registry.ts";

/**
 * Evaluates a site's manifest module on its own and returns its
 * `manifest` export. Types are erased. Anything left that would load
 * another module (a value import, a require, a dynamic import) is refused:
 * a manifest is data, and the site's header imports it, not the reverse.
 */
export function evaluateManifest(source: string, where: string): unknown {
  const { outputText } = ts.transpileModule(source, {
    fileName: "manifest.ts",
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  if (/\brequire\s*\(|\bimport\s*\(/.test(outputText)) {
    throw new Error(`${where} imports at runtime. A manifest may import types and nothing else.`);
  }
  const module = { exports: {} as Record<string, unknown> };
  new Function("module", "exports", outputText)(module, module.exports);
  return module.exports.manifest;
}

/** Where a site's files come from: GitHub at a ref, or a local checkout. */
export type Source = { kind: "github"; ref: string } | { kind: "local"; dir: string };

/**
 * One file of a site. From GitHub through the `gh` CLI, so it reads with
 * whatever `gh` is signed in as: the developer locally, `GH_TOKEN` in CI
 * (a token with Contents read on the site's repository).
 */
function readSiteFile(entry: ConsumerEntry, source: Source, path: string): string {
  if (source.kind === "local") return readFileSync(join(source.dir, path), "utf8");
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const result = spawnSync(
    "gh",
    ["api", "-H", "Accept: application/vnd.github.raw", `/repos/${entry.repo}/contents/${encoded}?ref=${encodeURIComponent(source.ref)}`],
    { encoding: "utf8" },
  );
  if (result.error) throw new Error(`gh is not available: ${result.error.message}`);
  if (result.status !== 0) {
    const said = (result.stderr || result.stdout).trim();
    // In Actions, gh without a token says so at length. Say what to set.
    const why = /GH_TOKEN/.test(said)
      ? "no token: the GH_CONSUMERS_TOKEN secret needs Contents read on this repository"
      : said.split("\n")[0];
    throw new Error(`${entry.repo}@${source.ref}:${path} could not be read (${why})`);
  }
  return result.stdout;
}

/** A site's manifest, read, checked and resolved for rendering. */
export function readConsumer(entry: ConsumerEntry, source: Source): Consumer {
  const where = source.kind === "local" ? `${source.dir}/${entry.manifest}` : `${entry.repo}@${source.ref}:${entry.manifest}`;
  const value = evaluateManifest(readSiteFile(entry, source, entry.manifest), where);
  const problems = checkManifest(value);
  if (problems.length > 0) throw new Error(`${where}: ${problems.join(", ")}`);
  const manifest = value as Manifest;
  const messages = manifest.messages
    ? (JSON.parse(readSiteFile(entry, source, manifest.messages.file)) as unknown)
    : undefined;
  const ref = source.kind === "local" ? `local ${source.dir}` : source.ref;
  return resolveManifest(entry, ref, manifest, messages);
}
