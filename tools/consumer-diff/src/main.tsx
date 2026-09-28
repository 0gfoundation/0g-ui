import { createRoot } from "react-dom/client";

// The page first, then the site's stylesheet, so the site's own rules
// (its body's background and type) win over the fixture's defaults.
import "./page.css";
import "@host.css";
import registry from "../../../consumers.json";
import { Fixture } from "./fixture";
import type { Registry } from "./registry";

/**
 * `?consumer=<name>&theme=light|dark`. The theme is stamped and stored
 * before the first render, as a site's bootstrap does, so the theme
 * button and the dark tokens agree from the first paint.
 */
const params = new URLSearchParams(window.location.search);
const consumers = (registry as Registry).consumers;
const name = params.get("consumer") ?? consumers[0]?.name;
const consumer = consumers.find((c) => c.name === name);
const theme = params.get("theme") === "dark" ? "dark" : "light";

try {
  window.localStorage.setItem("0g.theme", theme);
} catch {
  // Storage is only for the theme button's label; the stamp below is what paints.
}
document.documentElement.dataset.theme = theme;

const root = createRoot(document.getElementById("root")!);
if (consumer) {
  root.render(<Fixture consumer={consumer} />);
} else {
  root.render(<p>No consumer named {name} in consumers.json.</p>);
}
