import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // The package imports no framework (ADR-0012 §2): routing differs per
  // consumer, so the host passes Link and pathname through ShellProvider
  // and labels as strings. The hub enforced the same rule on src/shell
  // before the move.
  {
    files: ["packages/0g-ui/src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*", "next-intl", "next-intl/*", "react-router", "react-router/*", "react-router-dom", "@docusaurus/*"],
              message:
                "The package imports no framework (ADR-0012): the host passes Link and pathname through ShellProvider.",
            },
          ],
        },
      ],
    },
  },
);
