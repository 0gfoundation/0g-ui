import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buttonClasses } from "./button";
import { announceOutcome, NEWSLETTER_EVENT, refusal } from "./newsletter-form";
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

  it("puts the lockup after the links and socials, where it is on screen, so focus follows", () => {
    const html = render({ newsletter: { endpoint: "/api/newsletter" }, logo: createElement("span", null, "LOCKUP") });
    expect(html.indexOf("Sign up for our newsletter")).toBeLessThan(html.indexOf("Products"));
    expect(html.indexOf("LOCKUP")).toBeGreaterThan(html.indexOf('aria-label="Telegram"'));
    expect(html.indexOf("LOCKUP")).toBeLessThan(html.indexOf("All rights reserved"));
  });

  it("colours each element from its own footer token, never ink, which the slots read too", () => {
    const html = render({ newsletter: { endpoint: "/api/newsletter" } });
    for (const token of ["footer-title", "footer-heading", "footer-text", "footer-tagline", "footer-rule", "footer-social-line", "footer-glyph", "field-line", "field-submit"]) {
      expect(html).toContain(token);
    }
    expect(html).not.toMatch(/[ "](text|border|bg)-ink[ "]/);
  });

  it("puts the slots where they are documented", () => {
    const html = render({ before: createElement("i", null, "BEFORE"), after: createElement("i", null, "AFTER") });
    expect(html.indexOf("BEFORE")).toBeLessThan(html.indexOf("Products"));
    expect(html.indexOf("AFTER")).toBeGreaterThan(html.indexOf("Press"));
    expect(html.indexOf("AFTER")).toBeLessThan(html.indexOf("All rights reserved"));
  });
});

describe("the footer's layout", () => {
  it("gives a phone's column pairs equal halves, the right one never under four social boxes", () => {
    expect(render()).toContain("grid-cols-[minmax(0,1fr)_minmax(172px,1fr)]");
  });

  it("puts every column in one row on tablets, with the newsletter and socials under them on the same grid", () => {
    const html = render({ newsletter: { endpoint: "/api/newsletter" } });
    expect(html).toContain("md:grid-cols-[repeat(var(--footer-columns),minmax(0,1fr))]");
    expect(html).toMatch(/md:row-start-2 md:\[grid-column:1\/var\(--footer-half\)\][^"]*"><p[^>]*>Sign up/);
    expect(html).toMatch(/md:row-start-2 md:\[grid-column:var\(--footer-half\)\/-1\][^"]*"><p[^>]*>Socials/);
  });

  it("starts the socials on the column line that opens the right half", () => {
    expect(render()).toContain("--footer-half:3");
    expect(render({ changes: { remove: ["enterprise"] } })).toContain("--footer-half:2");
  });

  it("keeps the side gutter at 16px on phones", () => {
    expect(render()).toMatch(/ px-\[16px\] .* md:px-\[32px\]/);
  });
});

describe("the newsletter's outcome", () => {
  it("is the route's refusal by status, which the site words in its own labels", () => {
    expect(refusal(400)).toBe("invalid");
    expect(refusal(429)).toBe("limited");
    expect(refusal(503)).toBe("closed");
    expect(refusal(502)).toBe("failed");
    expect(refusal(0)).toBe("failed");
  });

  it("is announced on window as the outcome alone, never the address", () => {
    const target = new EventTarget();
    const had = "window" in globalThis;
    const previous = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = target;
    try {
      const seen: unknown[] = [];
      target.addEventListener(NEWSLETTER_EVENT, (e) => seen.push((e as CustomEvent).detail));
      announceOutcome("limited");
      expect(NEWSLETTER_EVENT).toBe("0g-ui:newsletter");
      expect(seen).toEqual([{ outcome: "limited" }]);
    } finally {
      if (had) (globalThis as { window?: unknown }).window = previous;
      else delete (globalThis as { window?: unknown }).window;
    }
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
