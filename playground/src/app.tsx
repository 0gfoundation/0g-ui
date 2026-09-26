import {
  ActivityIcon,
  DiscoverIcon,
  ExplorerIcon,
  PortfolioIcon,
  ShellScroll,
  SiteHeader,
  SwapIcon,
  TabBar,
  type ShellItem,
} from "@0gfoundation/0g-ui/shell";
import { ThemeButton } from "@0gfoundation/0g-ui/theme";

import { Compare } from "./compare";
import { Logo } from "./logo";
import { Probe } from "./probe";

/**
 * The hub's nav as sample items: four in-app entries and an outbound
 * one, five in all, the width the phone pill was measured for. The
 * short label is what the phone tab shows where the full one does not
 * fit five tabs.
 */
const ITEMS: readonly ShellItem[] = [
  { href: "/discover", label: "Discover", icon: DiscoverIcon },
  { href: "/swap", label: "Bridge & Swap", shortLabel: "Swap", icon: SwapIcon },
  { href: "/activity", label: "Activity", icon: ActivityIcon },
  { href: "/portfolio", label: "Portfolio", icon: PortfolioIcon },
  { href: "https://chainscan.0g.ai", label: "Explorer", icon: ExplorerIcon, external: true },
];

/**
 * The shell over enough content to scroll, laid out as the hub lays it
 * out: the header at every width, the tab bar below lg, the scroll
 * driver, and the probe behind `?probe`. No ShellProvider: a plain site
 * needs none, the defaults are `<a>` and window.location.pathname, and
 * the links are real navigations here.
 */
export function App() {
  if (window.location.pathname === "/compare") return <Compare />;
  return (
    <>
      <div className="pg-page">
        <SiteHeader
          logo={<Logo />}
          items={ITEMS}
          navLabel="Main"
          controls={
            <ThemeButton toDarkLabel="Switch to dark mode" toLightLabel="Switch to light mode" />
          }
        />
        <main className="pg-main">
          <section className="pg-hero pg-hero-light">
            <h1>Light hero</h1>
            <p>The header's top-of-page scrim keeps the mark legible over a light block.</p>
          </section>
          {Array.from({ length: 24 }, (_, i) => (
            <article key={i} className="pg-card">
              <h2>Card {i + 1}</h2>
              <p>
                Sample content for the scroll: enough rows that the header can scroll off, the
                tab bar can compact and a flick up can reveal the header over the page.
              </p>
            </article>
          ))}
          <section className="pg-hero pg-hero-dark">
            <h1>Dark hero</h1>
            <p>And the same scrim over a dark block, in both themes.</p>
          </section>
          {Array.from({ length: 16 }, (_, i) => (
            <article key={i + 24} className="pg-card">
              <h2>Card {i + 25}</h2>
              <p>The page keeps going so the bottom of the scroll is well past the pill.</p>
            </article>
          ))}
        </main>
      </div>
      <TabBar items={ITEMS} label="Main" />
      <ShellScroll />
      <Probe />
    </>
  );
}
