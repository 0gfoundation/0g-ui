import { useEffect, useState } from "react";

/**
 * The phone viewport readout behind `?probe` (`?probe=cover` applies
 * viewport-fit=cover first), as the hub's src/components/shell/shell-probe.tsx
 * had it. How to use it and what it has measured:
 * docs/spec/phone-shell-measurements-2026-09-21.md.
 */
export function Probe() {
  const [text, setText] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("probe")) return;
    if (params.get("probe") === "cover") {
      document
        .querySelector('meta[name="viewport"]')
        ?.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
    }
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;left:0;bottom:0;width:1px;padding-bottom:env(safe-area-inset-bottom,0px);padding-top:env(safe-area-inset-top,0px);visibility:hidden";
    document.body.appendChild(probe);
    const read = () => {
      const cs = getComputedStyle(probe);
      const nav = document.querySelector(".shell-nav")?.getBoundingClientRect();
      const vv = window.visualViewport;
      const ua = navigator.userAgent;
      const os = /iP(?:hone|od) OS (\d+_\d+)/.exec(ua)?.[1]?.replace("_", ".") ?? "n/a";
      const browser = /CriOS/.test(ua)
        ? "chrome"
        : /FxiOS/.test(ua)
          ? "firefox"
          : /Safari\//.test(ua)
            ? "safari-ua"
            : "other";
      setText(
        [
          `browser ${browser}  ua-os ${os}  ${/Version\/(\d+\.\d+)/.exec(ua)?.[0] ?? "no Version"}`,
          `anchor-css ${CSS.supports("anchor-name", "--s")}`,
          `stamp ${"iosSafari" in document.documentElement.dataset ? "ios-safari" : "none"}`,
          `inset-bottom ${cs.paddingBottom}  top ${cs.paddingTop}`,
          `innerHeight ${window.innerHeight}  screen ${window.screen.height}`,
          `visualViewport ${vv ? Math.round(vv.height) : "n/a"} @${vv ? Math.round(vv.offsetTop) : ""}`,
          `nav bottom ${nav ? Math.round(nav.bottom) : "n/a"}  (top ${nav ? Math.round(nav.top) : ""})`,
          `viewport bottom ${Math.round(probe.getBoundingClientRect().bottom)}`,
          `scrollY ${Math.round(window.scrollY)}`,
          ua.replace(/^Mozilla\/5\.0 /, "").replace(/\) /g, ")\n  "),
        ].join("\n"),
      );
    };
    read();
    const id = window.setInterval(read, 500);
    return () => {
      window.clearInterval(id);
      probe.remove();
    };
  }, []);
  if (!text) return null;
  return (
    <pre
      style={{
        position: "fixed",
        top: 80,
        right: 8,
        zIndex: 100,
        margin: 0,
        padding: "8px 10px",
        background: "rgba(0,0,0,0.85)",
        color: "#0f0",
        font: "11px/1.4 ui-monospace, monospace",
        borderRadius: 8,
        maxWidth: "calc(100vw - 16px)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
      }}
    >
      {text}
    </pre>
  );
}
