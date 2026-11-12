import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NavDropdown, PanelLink, SubLinks } from "./nav-dropdown";

// The two glyphs' paths: an outbound link says it leaves the site, an
// in-site one says "go" (Kevin, 2026-11-12).
const OUTBOUND = 'd="M7 17 17 7M8 7h9v9"';
const CHEVRON = 'd="m9 6 6 6-6 6"';

describe("PanelLink", () => {
  it("wears the outbound arrow, not the chevron, for another site", () => {
    const html = renderToStaticMarkup(
      createElement(PanelLink, { item: { href: "https://docs.0g.ai", label: "Docs", external: true } }),
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain(OUTBOUND);
    expect(html).not.toContain(CHEVRON);
  });

  it("keeps the chevron for a page of the site", () => {
    const html = renderToStaticMarkup(createElement(PanelLink, { item: { href: "/partners", label: "Partners" } }));
    expect(html).toContain(CHEVRON);
    expect(html).not.toContain(OUTBOUND);
  });
});

describe("SubLinks", () => {
  it("gives each secondary link the glyph for where it goes", () => {
    const html = renderToStaticMarkup(
      createElement(SubLinks, {
        item: {
          href: "/x",
          label: "X",
          links: [
            { href: "/blog", label: "Blog" },
            { href: "https://x.com", label: "X", external: true },
          ],
        },
      }),
    );
    const [blog, x] = html.split("</a>");
    expect(blog).toContain(CHEVRON);
    expect(x).toContain(OUTBOUND);
  });
});

describe("NavDropdown's descriptions", () => {
  const panel = (sections: number) =>
    renderToStaticMarkup(
      createElement(NavDropdown, {
        group: {
          label: "G",
          sections: Array.from({ length: sections }, (_, i) => ({
            items: [{ href: `/${i}`, label: `L${i}`, description: "D" }],
          })),
        },
        open: true,
        onOpenChange: () => {},
      }),
    );

  // Kevin, 2026-11-12: the 280px cap left a one-column panel's
  // descriptions in its left quarter
  it("wraps at half the panel in a one-column panel", () => {
    expect(panel(1)).toContain("max-w-[max(280px,50%)]");
  });

  it("wraps at the column's width when there are several", () => {
    const html = panel(2);
    expect(html).not.toContain("max-w-[max(280px,50%)]");
    expect(html).not.toContain("max-w-[280px]");
  });
});
