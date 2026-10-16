import { describe, expect, it } from "vitest";

import {
  applyFooterChanges,
  checkFooterChanges,
  FOOTER_CONTENT,
  FOOTER_LABELS,
  localPath,
  socialId,
} from "./footer-content";

const ids = (content = FOOTER_CONTENT) => content.columns.flatMap((c) => [c.id, ...c.links.map((l) => l.id)]);

describe("the shared footer content", () => {
  it("gives every column, link and label its own id, since `remove` and `labels` go by id", () => {
    const all = [...ids(), ...FOOTER_CONTENT.socials.map(socialId), ...Object.keys(FOOTER_LABELS)];
    expect(new Set(all).size).toBe(all.length);
  });

  it("keeps the socials' ids apart from the links': a site's GitHub link would not be the GitHub account", () => {
    expect(FOOTER_CONTENT.socials.map(socialId)).toContain("socials.github");
    expect(ids()).not.toContain("socials.github");
  });

  it("matches the design: Enterprise then Company, every column on phones, YouTube last", () => {
    expect(FOOTER_CONTENT.columns.map((c) => c.id)).toEqual(["products", "build", "enterprise", "company"]);
    expect(FOOTER_CONTENT.columns.filter((c) => c.phone === false)).toEqual([]);
    expect(FOOTER_CONTENT.socials.at(-1)?.network).toBe("youtube");
    // GitHub is a social only, About Us went with the FAQ it linked to
    expect(ids()).not.toContain("github");
    expect(ids()).not.toContain("about");
  });
});

describe("applyFooterChanges", () => {
  it("returns the shared content unchanged when a site has no changes", () => {
    expect(applyFooterChanges(FOOTER_CONTENT)).toEqual(FOOTER_CONTENT);
  });

  it("removes links, columns and socials by id", () => {
    const out = applyFooterChanges(FOOTER_CONTENT, { remove: ["faucet", "enterprise", "socials.telegram"] });
    expect(ids(out)).not.toContain("faucet");
    expect(out.columns.map((c) => c.id)).not.toContain("enterprise");
    expect(out.socials.map((s) => s.network)).not.toContain("telegram");
  });

  it("appends a site's links to a shared column, and its own columns and socials after the shared ones", () => {
    const out = applyFooterChanges(FOOTER_CONTENT, {
      add: { build: [{ id: "bridge", label: "Bridge", href: "https://hub.0g.ai/bridge" }] },
      columns: [{ id: "legalMore", label: "More", links: [{ id: "status", label: "Status", href: "https://status.0g.ai" }] }],
      socials: [{ network: "x", href: "https://x.com/0g_hub" }],
    });
    const build = out.columns.find((c) => c.id === "build")!;
    expect(build.links.at(-1)?.id).toBe("bridge");
    expect(out.columns.at(-1)?.id).toBe("legalMore");
    expect(out.socials.at(-1)?.href).toBe("https://x.com/0g_hub");
  });

  it("drops a column whose links were all removed, rather than draw a heading over nothing", () => {
    const out = applyFooterChanges(FOOTER_CONTENT, { remove: ["enterpriseOverview", "contact"] });
    expect(out.columns.map((c) => c.id)).not.toContain("enterprise");
  });
});

describe("checkFooterChanges", () => {
  it("passes changes that name what exists", () => {
    expect(checkFooterChanges(FOOTER_CONTENT, { remove: ["faucet", "socials.x"] })).toEqual([]);
  });

  it("reports a typo in remove, which would otherwise silently keep the link", () => {
    expect(checkFooterChanges(FOOTER_CONTENT, { remove: ["faucett"] })).toEqual([
      "footer.remove: faucett is not a shared column, link or social",
    ]);
  });

  it("reports an add to a column that does not exist, and an id that collides", () => {
    expect(
      checkFooterChanges(FOOTER_CONTENT, {
        add: { tools: [{ id: "scan", label: "Scan", href: "https://x" }], build: [{ id: "docs", label: "Docs", href: "https://y" }] },
      }),
    ).toEqual([
      "footer.add: tools is not a shared column (a new one goes in footer.columns)",
      "footer: docs is already a shared id",
    ]);
  });

  it("reports an added id that is a label's, which would take that label's translation", () => {
    expect(checkFooterChanges(FOOTER_CONTENT, { add: { company: [{ id: "terms", label: "Terms", href: "https://z" }] } })).toEqual([
      "footer: terms is already a shared id",
    ]);
  });
});

describe("localPath", () => {
  it("turns a link on the site's own origin into an in-app path", () => {
    expect(localPath("https://0g.ai/blog", "https://0g.ai")).toBe("/blog");
    expect(localPath("https://0g.ai", "https://0g.ai/")).toBe("/");
    expect(localPath("/press")).toBe("/press");
  });

  it("leaves another site's links absolute, and a lookalike origin too", () => {
    expect(localPath("https://0g.ai/blog")).toBeNull();
    expect(localPath("https://hub.0g.ai", "https://0g.ai")).toBeNull();
    expect(localPath("https://0g.ai.evil.example/x", "https://0g.ai")).toBeNull();
  });
});
