import { defineConfig } from "vitest/config";

// The shell's tests are pure (the reducer, the item rules, the two
// bootstrap strings run against a stub document), so they run in node.
export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts"],
  },
});
