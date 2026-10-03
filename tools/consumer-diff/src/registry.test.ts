import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import * as shell from "../../../packages/0g-ui/src/shell/index";
import { evaluateManifest } from "./manifest";
import { checkConsumer, checkManifest, checkRegistry, resolveManifest, type Manifest, type Registry } from "./registry";

const registry = JSON.parse(readFileSync(new URL("../../../consumers.json", import.meta.url), "utf8")) as Registry;
const exports = shell as unknown as Record<string, unknown>;

const HUB_LIKE = `
import type { ShellItem } from "@0gfoundation/0g-ui/shell";

// A comment the site keeps.
const ITEMS = [
  { href: "/swap", label: "swap", shortLabel: "swapMobile", icon: "SwapIcon" },
  { href: "https://chainscan.0g.ai", label: "explorer", icon: "ExplorerIcon", external: true },
] satisfies Omit<ShellItem, "icon">[] & { icon: string }[];

export const manifest = {
  css: "tailwind.css",
  themes: ["light", "dark"],
  messages: { file: "messages/en.json", namespace: "nav" },
  header: { navLabel: "primary", items: ITEMS },
  tabBar: { label: "primary" },
  fixture: { path: "/swap", logo: { label: "0G Hub", width: 100, height: 30 } },
} as const;
`;

const MESSAGES = { nav: { swap: "Bridge & Swap", swapMobile: "Swap", explorer: "Explorer", primary: "Main" } };
const entry = { name: "hub", repo: "0gfoundation/0g-hub", ref: "main", manifest: "src/components/shell/0g-ui.manifest.ts" };

describe("consumers.json", () => {
  it("is a list of sites and where each keeps its manifest", () => {
    expect(checkRegistry(registry)).toEqual([]);
  });
});

describe("a manifest", () => {
  it("evaluates on its own, types erased and comments kept out of the way", () => {
    const value = evaluateManifest(HUB_LIKE, "hub");
    expect(checkManifest(value)).toEqual([]);
    expect((value as Manifest).header.items).toHaveLength(2);
  });

  it("may not import anything at runtime", () => {
    const source = `import { SwapIcon } from "@0gfoundation/0g-ui/shell";\nexport const manifest = { icon: SwapIcon };`;
    expect(() => evaluateManifest(source, "site")).toThrow("imports at runtime");
  });

  it("resolves its labels through the site's messages", () => {
    const consumer = resolveManifest(entry, "main", evaluateManifest(HUB_LIKE, "hub") as Manifest, MESSAGES);
    expect(consumer.header.navLabel).toBe("Main");
    expect(consumer.header.items[0]).toMatchObject({ label: "Bridge & Swap", shortLabel: "Swap", icon: "SwapIcon" });
    expect(consumer.tabBar).toEqual({ label: "Main" });
    expect(checkConsumer(consumer, exports)).toEqual([]);
  });

  it("needs no logo stub where the package draws the lockup, and keeps the product's name as written", () => {
    const manifest = evaluateManifest(HUB_LIKE, "hub") as Manifest;
    const withProduct = { ...manifest, header: { ...manifest.header, product: "Hub" }, fixture: { path: "/swap" } };
    expect(checkManifest(withProduct)).toEqual([]);
    expect(checkManifest({ ...withProduct, header: manifest.header })).toEqual(["fixture needs path, and logo unless header.product"]);
    const consumer = resolveManifest(entry, "main", withProduct, MESSAGES);
    expect(consumer.header.product).toBe("Hub");
    expect(checkConsumer(consumer, exports)).toEqual([]);
    expect(checkConsumer(consumer, { ...exports, Lockup: undefined })).toEqual([
      "the site draws the default lockup, and this build has none",
    ]);
  });

  it("names a label its messages lack", () => {
    const manifest = evaluateManifest(HUB_LIKE, "hub") as Manifest;
    expect(() => resolveManifest(entry, "main", manifest, { nav: { primary: "Main" } })).toThrow(
      "label nav.swap is not in messages/en.json",
    );
  });

  it("reports an icon the build does not export and a tab bar over groups", () => {
    const consumer = resolveManifest(entry, "main", evaluateManifest(HUB_LIKE, "hub") as Manifest, MESSAGES);
    consumer.header.items = [{ href: "/a", label: "A", icon: "NoSuchIcon" }, { label: "G", sections: [] }];
    expect(checkConsumer(consumer, exports)).toEqual([
      "icon NoSuchIcon is not an export of @0gfoundation/0g-ui/shell",
      "a tab bar takes links only, and the items hold groups",
    ]);
  });
});

describe("a manifest's footer", () => {
  const withFooter = (footer: string) =>
    evaluateManifest(HUB_LIKE.replace(`tabBar: { label: "primary" },`, `tabBar: { label: "primary" },\n  footer: ${footer},`), "hub") as Manifest;
  const messages = { ...MESSAGES, footer: { operator: "Operator and publisher of the 0G Hub.", builderHub: "Builder Hub" } };

  it("resolves its changes, newsletter and labels for the fixture", () => {
    const manifest = withFooter(`{ changes: { remove: ["faucet"] }, newsletter: true, labels: { namespace: "footer" } }`);
    expect(checkManifest(manifest)).toEqual([]);
    const consumer = resolveManifest(entry, "main", manifest, messages);
    expect(consumer.footer).toMatchObject({ changes: { remove: ["faucet"] }, newsletter: true, labels: { builderHub: "Builder Hub" } });
    expect(checkConsumer(consumer, exports)).toEqual([]);
  });

  it("reports an id the shared content lacks, and a build with no footer", () => {
    const consumer = resolveManifest(entry, "main", withFooter(`{ changes: { remove: ["faucett"] } }`), MESSAGES);
    expect(checkConsumer(consumer, exports)).toEqual(["footer.remove: faucett is not a shared column, link or social"]);
    const { SiteFooter: _footer, ...older } = exports;
    expect(checkConsumer(consumer, older)).toEqual(["the site has a footer, and this build exports no SiteFooter"]);
  });

  it("checks the footer's shape", () => {
    expect(checkManifest(withFooter(`{ changes: { remove: "faucet" } }`))).toEqual(["footer.changes.remove must list ids"]);
    expect(checkManifest(withFooter(`{ labels: "footer" }`))).toEqual(["footer.labels needs a namespace"]);
  });

  it("names a labels namespace the messages lack", () => {
    expect(() => resolveManifest(entry, "main", withFooter(`{ labels: { namespace: "footer" } }`), MESSAGES)).toThrow(
      "footer labels: footer is not a namespace",
    );
  });
});
