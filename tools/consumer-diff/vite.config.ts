import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type InlineConfig } from "vite";

const here = fileURLToPath(new URL(".", import.meta.url));
const repo = fileURLToPath(new URL("../../", import.meta.url));

/**
 * The fixture page built against one side of a diff. `shell` and `theme`
 * are that side's entry modules, `hostCss` the stylesheet generated for
 * the site (run.ts), which imports that side's CSS entry. React resolves
 * from this package, one copy for the page and the side's modules alike.
 */
export function harnessConfig(o: {
  shell: string;
  theme: string;
  hostCss: string;
  base?: string;
  outDir?: string;
}): InlineConfig {
  return {
    configFile: false,
    root: here,
    base: o.base ?? "/",
    logLevel: "error",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        // Exact matches, so `…/shell` never captures `…/shell.css`.
        { find: /^@0gfoundation\/0g-ui\/shell$/, replacement: o.shell },
        { find: /^@0gfoundation\/0g-ui\/theme$/, replacement: o.theme },
        { find: /^@host\.css$/, replacement: o.hostCss },
      ],
      dedupe: ["react", "react-dom"],
    },
    build: { outDir: o.outDir, emptyOutDir: true, reportCompressedSize: false },
  };
}

/**
 * `pnpm --filter @0gfoundation/0g-ui-consumer-diff dev`: the fixtures on
 * the working tree's sources, `/?consumer=<name>&theme=light|dark`, for
 * looking at an entry by hand. Without the sites' own hostCss.
 */
export default defineConfig(() => {
  const dir = `${here}.work/dev`;
  mkdirSync(dir, { recursive: true });
  const hostCss = `${dir}/host.css`;
  writeFileSync(
    hostCss,
    [
      `@import "tailwindcss" source(none);`,
      `@import "${repo}packages/0g-ui/src/tailwind.css";`,
      `@source "${repo}packages/0g-ui/src/shell";`,
    ].join("\n"),
  );
  return harnessConfig({
    shell: `${repo}packages/0g-ui/src/shell/index.ts`,
    theme: `${repo}packages/0g-ui/src/shell/theme/index.ts`,
    hostCss,
  });
});
