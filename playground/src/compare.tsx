import { useEffect, useRef, useState } from "react";

/**
 * The two CSS paths side by side (ADR-0012 §2): the page through the
 * Tailwind source entry and through the compiled shell.css, at phone
 * and desktop widths, in the current theme. Below the frames, every
 * computed style and box of every element in the header and the tab bar
 * is compared pair by pair, so a difference between the paths reads as
 * a list, not a squint. The host's Tailwind version and theme are what
 * the two paths can disagree on; here they share both.
 */
const FRAMES = [
  { id: "phone", width: 390, height: 640 },
  { id: "desktop", width: 1100, height: 320 },
] as const;
const PATHS = ["source", "compiled"] as const;

const SHELL = "[data-shell-header], [data-shell-header] *, .shell-nav, .shell-nav *";

function describe(el: Element): string {
  const cls = el.getAttribute("class")?.split(/\s+/).slice(0, 2).join(".");
  return el.tagName.toLowerCase() + (cls ? `.${cls}` : "");
}

/** Every differing property or box edge between two frames' shells. */
function diff(a: Window, b: Window): string[] {
  const ea = Array.from(a.document.querySelectorAll(SHELL));
  const eb = Array.from(b.document.querySelectorAll(SHELL));
  const out: string[] = [];
  if (ea.length !== eb.length) out.push(`element count: ${ea.length} vs ${eb.length}`);
  for (let i = 0; i < Math.min(ea.length, eb.length); i++) {
    const sa = a.getComputedStyle(ea[i]);
    const sb = b.getComputedStyle(eb[i]);
    for (const prop of Array.from(sa)) {
      // The host's own theme variables are not the shell's; their effect
      // is in the computed values compared here.
      if (prop.startsWith("--")) continue;
      const va = sa.getPropertyValue(prop);
      const vb = sb.getPropertyValue(prop);
      if (va !== vb) out.push(`${describe(ea[i])} ${prop}: ${va} | ${vb}`);
    }
    const ra = ea[i].getBoundingClientRect();
    const rb = eb[i].getBoundingClientRect();
    for (const edge of ["x", "y", "width", "height"] as const) {
      if (Math.abs(ra[edge] - rb[edge]) > 0.5) {
        out.push(`${describe(ea[i])} ${edge}: ${ra[edge].toFixed(1)} | ${rb[edge].toFixed(1)}`);
      }
    }
  }
  return out;
}

export function Compare() {
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  const [loaded, setLoaded] = useState(0);
  const [report, setReport] = useState<Record<string, string[]>>();

  useEffect(() => {
    if (loaded < FRAMES.length * PATHS.length) return;
    // A tick for layout and fonts to settle in every frame.
    const id = window.setTimeout(() => {
      const next: Record<string, string[]> = {};
      for (const f of FRAMES) {
        const [a, b] = PATHS.map((p) => frames.current.get(`${f.id}-${p}`)?.contentWindow);
        next[f.id] = a && b ? diff(a, b) : ["frame missing"];
      }
      setReport(next);
    }, 300);
    return () => window.clearTimeout(id);
  }, [loaded]);

  return (
    <div className="pg-compare">
      <h1>Source entry | compiled shell.css</h1>
      {FRAMES.map((f) => (
        <section key={f.id} className="pg-compare-row">
          {PATHS.map((p) => (
            <figure key={p}>
              <figcaption>
                {f.id}, {p}
              </figcaption>
              <iframe
                ref={(el) => {
                  if (el) frames.current.set(`${f.id}-${p}`, el);
                }}
                title={`${f.id} ${p}`}
                src={`/discover?css=${p}`}
                width={f.width}
                height={f.height}
                onLoad={() => setLoaded((n) => n + 1)}
              />
            </figure>
          ))}
          <pre>
            {!report
              ? "comparing…"
              : report[f.id].length === 0
                ? "no difference in the header or the tab bar"
                : report[f.id].join("\n")}
          </pre>
        </section>
      ))}
    </div>
  );
}
