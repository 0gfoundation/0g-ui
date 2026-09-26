import { createRoot } from "react-dom/client";

import "./playground.css";
import { App } from "./app";

/**
 * Which stylesheet the page runs on: the Tailwind source entry through
 * the playground's own Tailwind (host.css, the default), or the compiled
 * shell.css a host without Tailwind imports (`?css=compiled`, built by
 * `pnpm build` or the package's prepare script). One or the other, never
 * both, as a host must.
 */
const compiled = new URLSearchParams(window.location.search).get("css") === "compiled";
await (compiled ? import("@0gfoundation/0g-ui/shell.css") : import("./host.css"));
document.documentElement.dataset.css = compiled ? "compiled" : "source";

createRoot(document.getElementById("root")!).render(<App />);
