import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Lockup } from "./lockup";
import { ShellProvider, type ShellLinkProps } from "./provider";
import { SiteHeader } from "./site-header";

const render = (props: Partial<Parameters<typeof SiteHeader>[0]> = {}) =>
  renderToStaticMarkup(createElement(SiteHeader, { items: [], navLabel: "Main", ...props }));

describe("SiteHeader's lockup", () => {
  it("draws the mark alone by default, named 0G and linking home", () => {
    const html = render();
    expect(html).toMatch(/<a href="\/" aria-label="0G"/);
    expect(html).toContain('viewBox="0 9 160 78"');
    expect(html).not.toContain("bg-lockup-rule");
  });

  it("adds the divider and the product's name with a product", () => {
    const html = render({ product: "Hub" });
    expect(html).toContain('aria-label="0G Hub"');
    expect(html).toContain("bg-lockup-rule");
    expect(html).toMatch(/>Hub<\/span>/);
  });

  it("draws a site's own logo in its place, which wins over product", () => {
    const html = render({ logo: createElement("i", null, "OWN"), product: "Hub" });
    expect(html).toContain("<i>OWN</i>");
    expect(html).not.toContain('aria-label="0G Hub"');
    expect(html).not.toContain('viewBox="0 9 160 78"');
  });

  it("takes its desktop size where the bar starts", () => {
    expect(render({ product: "Hub" })).toContain("lg:w-[64px]");
    const md = render({ product: "Hub", collapse: "md" });
    expect(md).toContain("md:w-[64px]");
    expect(md).not.toContain("lg:w-[64px]");
  });

  it("puts the same lockup at the top of the phone menu", () => {
    const html = render({ product: "Hub", menu: { label: "Menu", closeLabel: "Close menu" } });
    expect(html.match(/aria-label="0G Hub"/g)?.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Lockup", () => {
  it("links through the host's Link", () => {
    const Link = (props: ShellLinkProps) => createElement("a", { ...props, "data-host": "" });
    const html = renderToStaticMarkup(
      createElement(ShellProvider, { Link, pathname: "/", children: createElement(Lockup, { product: "Hub" }) }),
    );
    expect(html).toContain("data-host");
    expect(html).toContain('aria-label="0G Hub"');
  });
});
