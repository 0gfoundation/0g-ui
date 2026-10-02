import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buttonClasses } from "./button";
import { SiteFooter } from "./site-footer";

const render = (props: Partial<Parameters<typeof SiteFooter>[0]> = {}) =>
  renderToStaticMarkup(createElement(SiteFooter, { logo: createElement("span", null, "0G"), ...props }));

describe("SiteFooter", () => {
  it("renders the shared columns, the socials and the legal row with the operator sentence", () => {
    const html = render();
    for (const text of ["Products", "Builder Hub", "Sales Team", "Foundation", "Socials", "The AI trust layer"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain(`© ${new Date().getFullYear()} Zero Gravity Labs Inc. Operator and publisher of the 0G Hub. All rights reserved.`);
    expect(html).toContain('aria-label="LinkedIn"');
    expect(html).toContain('<nav aria-label="Footer"');
  });

  it("hides a phone: false column below md and nothing else", () => {
    const html = render();
    expect(html.match(/max-md:hidden/g)).toHaveLength(1);
    expect(html).toMatch(/max-md:hidden[^>]*><p[^>]*>Enterprise</);
  });

  it("has a newsletter only where the site gives it an endpoint", () => {
    expect(render()).not.toContain("Sign up for our newsletter");
    const html = render({ newsletter: { endpoint: "https://0g.ai/api/newsletter" } });
    expect(html).toContain("Sign up for our newsletter");
    expect(html).toContain('type="email"');
  });

  it("applies a site's changes and its translated labels", () => {
    const html = render({
      changes: { remove: ["faucet", "socials.discord"] },
      labels: { build: "Construire", builderHub: "Hub des bâtisseurs", operator: "Opérateur du 0G Hub." },
    });
    expect(html).not.toContain("Faucet");
    expect(html).not.toContain('aria-label="Discord"');
    expect(html).toContain("Construire");
    expect(html).toContain("Hub des bâtisseurs");
    expect(html).toContain("Zero Gravity Labs Inc. Opérateur du 0G Hub.");
  });

  it("links the site's own pages in the same tab and the rest in a new one", () => {
    const html = render({ origin: "https://0g.ai" });
    expect(html).toContain('href="/blog"');
    expect(html).not.toMatch(/href="\/blog"[^>]*target="_blank"/);
    expect(html).toMatch(/href="https:\/\/docs\.0g\.ai"[^>]*target="_blank"/);
  });

  it("sizes its grid's desktop track count to the columns it ends up with", () => {
    expect(render()).toContain("--footer-columns:4");
    expect(render({ changes: { remove: ["enterprise"] } })).toContain("--footer-columns:3");
  });

  it("puts the slots where they are documented", () => {
    const html = render({ before: createElement("i", null, "BEFORE"), after: createElement("i", null, "AFTER") });
    expect(html.indexOf("BEFORE")).toBeLessThan(html.indexOf("Products"));
    expect(html.indexOf("AFTER")).toBeGreaterThan(html.indexOf("Press"));
    expect(html.indexOf("AFTER")).toBeLessThan(html.indexOf("All rights reserved"));
  });
});

describe("buttonClasses", () => {
  it("is 48px by default and 32px small, a pill or a circle", () => {
    expect(buttonClasses()).toContain("h-[48px]");
    expect(buttonClasses({ size: "small" })).toContain("h-[32px]");
    expect(buttonClasses({ round: true })).toContain("size-[48px]");
    expect(buttonClasses({ round: true })).not.toContain("px-");
  });

  it("is 32px on phones and 48px from md when adaptive", () => {
    expect(buttonClasses({ size: "adaptive" })).toContain("h-[32px]");
    expect(buttonClasses({ size: "adaptive" })).toContain("md:h-[48px]");
    expect(buttonClasses({ size: "adaptive", round: true })).toContain("md:size-[48px]");
  });

  it("fills its container only as a pill", () => {
    expect(buttonClasses({ fullWidth: true })).toContain("w-full");
    expect(buttonClasses({ fullWidth: true, round: true })).not.toContain("w-full");
  });
});
