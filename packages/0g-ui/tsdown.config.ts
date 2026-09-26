import { defineConfig } from "tsdown";

/**
 * Two entries, `./shell` and `./theme` (ADR-0012 §1). Unbundled: one
 * output file per source module, so each keeps its own "use client"
 * directive where it has one, and a server component in a Next host can
 * still render site-header.tsx, which has none. React is a peer and
 * stays external.
 */
export default defineConfig({
  entry: ["src/shell/index.ts", "src/shell/theme/index.ts"],
  format: "esm",
  platform: "browser",
  unbundle: true,
  dts: true,
  clean: true,
  inputOptions: {
    // Rolldown warns that a module-level directive may not survive
    // bundling. In unbundle mode every module is its own file and keeps
    // it (dist/tab-bar.js and the other five start with "use client").
    onLog(level, log, handler) {
      if (log.code === "MODULE_LEVEL_DIRECTIVE") return;
      handler(level, log);
    },
  },
});
