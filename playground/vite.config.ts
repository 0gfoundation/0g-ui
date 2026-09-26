import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

import { SHELL_BOOTSTRAP } from "../packages/0g-ui/src/shell/bootstrap.ts";
import { THEME_BOOTSTRAP } from "../packages/0g-ui/src/shell/theme/theme.ts";

const source = (path: string) =>
  fileURLToPath(new URL(`../packages/0g-ui/${path}`, import.meta.url));

/**
 * The two pre-paint stamps go inline, first in <body>, exactly as a host
 * document carries them: the theme first, then the Safari stamp the tab
 * bar's bottom offset needs. Injected from the package's own strings so
 * the playground can never drift from what ships.
 */
const bootstrap: Plugin = {
  name: "0g-ui-bootstrap",
  transformIndexHtml: () => [
    { tag: "script", children: THEME_BOOTSTRAP, injectTo: "body-prepend" },
    { tag: "script", children: SHELL_BOOTSTRAP, injectTo: "body-prepend" },
  ],
};

export default defineConfig({
  plugins: [react(), tailwindcss(), bootstrap],
  resolve: {
    // The package's sources, not its dist: a change shows without a
    // build. CI's build step is what proves dist.
    alias: {
      "@0gfoundation/0g-ui/shell": source("src/shell/index.ts"),
      "@0gfoundation/0g-ui/theme": source("src/shell/theme/index.ts"),
    },
  },
  // Any path serves the page (SPA fallback), so the nav's links are real
  // navigations and the default pathname reader marks the active tab.
  appType: "spa",
});
