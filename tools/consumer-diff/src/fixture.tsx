import * as shell from "@0gfoundation/0g-ui/shell";
import * as theme from "@0gfoundation/0g-ui/theme";
import { createElement, type ComponentType, type CSSProperties, type ReactNode } from "react";

import { isGroupEntry, type Consumer, type Control, type NavEntry } from "./registry";

// The build decides which package these are (vite.config.ts aliases the
// two entries to one side's dist), so they are read as bags of exports:
// a prop or an export the base build lacks is simply absent there.
const pkg = shell as unknown as Record<string, unknown>;
const pkgTheme = theme as unknown as Record<string, unknown>;

function component(from: Record<string, unknown>, name: string): ComponentType<Record<string, unknown>> | null {
  const value = from[name];
  return typeof value === "function" ? (value as ComponentType<Record<string, unknown>>) : null;
}

const ShellProvider = component(pkg, "ShellProvider");
const SiteHeader = component(pkg, "SiteHeader");
const TabBar = component(pkg, "TabBar");
const ShellScroll = component(pkg, "ShellScroll");
const SiteFooter = component(pkg, "SiteFooter");
const ThemeButton = component(pkgTheme, "ThemeButton");

/** The registry's nav entries as the shell's, with icon names resolved. */
function toShellEntries(items: NavEntry[]): unknown[] {
  return items.map((entry) => {
    if (isGroupEntry(entry)) return entry;
    const { icon, ...rest } = entry;
    return icon ? { ...rest, icon: component(pkg, icon) } : rest;
  });
}

const srOnly: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/** A block the size of the site's lockup, in its ink. */
function LogoStub({ label, width, height }: { label: string; width: number; height: number }) {
  return (
    <a href="/" aria-label={label} className="cd-stub cd-logo" style={{ width, height }}>
      {label}
    </a>
  );
}

function ControlView({ control }: { control: Control }): ReactNode {
  if ("component" in control) {
    if (!ThemeButton) return null;
    return <ThemeButton toDarkLabel={control.toDarkLabel} toLightLabel={control.toLightLabel} />;
  }
  // A label only where it fits: a 34px circle is the site's glyph, not text.
  return (
    <button
      type="button"
      aria-label={control.stub}
      className="cd-stub cd-control"
      style={{ width: control.width, height: control.height ?? 34 }}
    >
      {control.width >= 60 ? control.stub : null}
    </button>
  );
}

/** The site's footer from the package, with its manifest's props, on a
 *  stand-in for its art. Nothing on a build without SiteFooter. */
function FooterView({ consumer }: { consumer: Consumer }): ReactNode {
  const footer = consumer.footer;
  if (!footer || !SiteFooter) return null;
  return createElement(SiteFooter, {
    logo: <LogoStub {...consumer.header.logo} />,
    changes: footer.changes,
    labels: footer.labels,
    origin: footer.origin,
    newsletter: footer.newsletter ? { endpoint: "/api/newsletter" } : undefined,
    background: footer.background ? <div style={{ position: "absolute", inset: 0, background: footer.background }} /> : undefined,
  });
}

/**
 * One site's page: its header and tab bar from the package, with the
 * registry's props, over content that gives the glass something to sit
 * on (a light block, then cards), and its footer. The pathname is fixed so the active
 * entry never depends on the URL the harness serves from.
 */
export function Fixture({ consumer }: { consumer: Consumer }) {
  if (!ShellProvider || !SiteHeader) throw new Error("the build exports no ShellProvider or SiteHeader");

  const { header, tabBar, layout } = consumer;
  const items = toShellEntries(header.items);
  const headerProps: Record<string, unknown> = {
    logo: <LogoStub {...header.logo} />,
    title: header.title ? <h1 style={srOnly}>{header.title}</h1> : undefined,
    items,
    navLabel: header.navLabel,
    controls: header.controls?.length ? (
      <>
        {header.controls.map((control, i) => (
          <ControlView key={i} control={control} />
        ))}
      </>
    ) : undefined,
  };
  if (header.width) headerProps.width = header.width;
  if (header.collapse) headerProps.collapse = header.collapse;
  if (header.menu) headerProps.menu = header.menu;

  const page = (
    <>
      <div className="cd-column" style={layout?.maxWidth ? { maxWidth: layout.maxWidth } : undefined}>
        {createElement(SiteHeader, headerProps)}
        <main className={layout?.contentUnderHeader ? "cd-main cd-under" : "cd-main"}>
          <section className="cd-hero">
            <h2>{consumer.name}</h2>
            <p>A light block under the header, so the glass and its shadow show.</p>
          </section>
          {Array.from({ length: 24 }, (_, i) => (
            <article key={i} className="cd-card">
              <h3>Card {i + 1}</h3>
              <p>Content for the scroll: the header scrolls off, the tab bar compacts.</p>
            </article>
          ))}
        </main>
      </div>
      <FooterView consumer={consumer} />
      {tabBar && TabBar ? createElement(TabBar, { items, label: tabBar.label }) : null}
      {ShellScroll ? createElement(ShellScroll, header.collapse ? { collapse: header.collapse } : {}) : null}
    </>
  );
  return createElement(ShellProvider, { pathname: consumer.path }, page);
}
