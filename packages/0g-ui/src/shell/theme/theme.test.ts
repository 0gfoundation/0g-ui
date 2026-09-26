import { describe, expect, it } from "vitest";

import {
  flipTheme,
  parseThemeSetting,
  resolveTheme,
  THEME_BOOTSTRAP,
  THEME_STORAGE_KEY,
  type ThemeSetting,
} from "./theme";

describe("parseThemeSetting", () => {
  it("accepts the two explicit settings", () => {
    expect(parseThemeSetting("light")).toBe("light");
    expect(parseThemeSetting("dark")).toBe("dark");
  });

  it("treats absence and junk as system", () => {
    expect(parseThemeSetting(null)).toBe("system");
    expect(parseThemeSetting("system")).toBe("system");
    expect(parseThemeSetting("Dark")).toBe("system");
    expect(parseThemeSetting("auto")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("explicit settings ignore the OS", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("system follows the OS", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("THEME_BOOTSTRAP", () => {
  /**
   * The inline script must MIRROR parseThemeSetting + resolveTheme — this
   * executes it against every (stored, os) combination and checks the
   * stamp matches the TS pair. Editing one without the other fails here.
   */
  const run = (stored: string | null, systemDark: boolean): string => {
    const documentElement: { dataset: Record<string, string> } = {
      dataset: {},
    };
    const fn = new Function(
      "localStorage",
      "matchMedia",
      "document",
      THEME_BOOTSTRAP,
    );
    fn(
      { getItem: (k: string) => (k === THEME_STORAGE_KEY ? stored : null) },
      () => ({ matches: systemDark }),
      { documentElement },
    );
    return documentElement.dataset.theme;
  };

  it.each([
    [null, false],
    [null, true],
    ["light", false],
    ["light", true],
    ["dark", false],
    ["dark", true],
    ["system", true],
    ["junk", false],
    ["junk", true],
  ] as const)("agrees with the TS resolution for (%s, os-dark=%s)", (stored, osDark) => {
    expect(run(stored, osDark)).toBe(
      resolveTheme(parseThemeSetting(stored), osDark),
    );
  });

  it("survives a storage-less context without stamping", () => {
    const documentElement: { dataset: Record<string, string> } = {
      dataset: {},
    };
    const fn = new Function(
      "localStorage",
      "matchMedia",
      "document",
      THEME_BOOTSTRAP,
    );
    fn(
      {
        getItem: () => {
          throw new Error("denied");
        },
      },
      () => ({ matches: true }),
      { documentElement },
    );
    expect(documentElement.dataset.theme).toBeUndefined();
  });
});

describe("flipTheme", () => {
  it("writes the opposite of what is on, never system", () => {
    // First visit: setting "system", light OS → the button shows light.
    let setting: ThemeSetting = "system";
    const systemDark = false;
    expect(resolveTheme(setting, systemDark)).toBe("light");
    // Click: dark, stored explicitly.
    setting = flipTheme(resolveTheme(setting, systemDark));
    expect(setting).toBe("dark");
    // Click again: light, stored explicitly — NOT back to system.
    setting = flipTheme(resolveTheme(setting, systemDark));
    expect(setting).toBe("light");
    // And the OS no longer has a say.
    expect(resolveTheme(setting, true)).toBe("light");
  });

  it("from system on a dark OS the first click lands on light", () => {
    expect(flipTheme(resolveTheme("system", true))).toBe("light");
  });
});
