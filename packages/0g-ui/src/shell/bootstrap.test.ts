import { describe, expect, it } from "vitest";

import { isIosSafari, SHELL_BOOTSTRAP } from "./bootstrap";

/** Safari 26 as the owner's iOS 26 phone reports it: the OS number is frozen at 18. */
const SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const SAFARI_NO_VERSION =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1";
const CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1";
const FIREFOX =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/142.0 Mobile/15E148 Safari/605.1.15";
const SAFARI_18 =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
const MAC_SAFARI =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";

describe("isIosSafari (#428)", () => {
  it("is Safari 26 or later on an iPhone and nothing else", () => {
    expect(isIosSafari(SAFARI)).toBe(true);
    expect(isIosSafari(SAFARI_18)).toBe(false);
    expect(isIosSafari(SAFARI.replace("Version/26.0", "Version/27.1"))).toBe(true);
    // No Version token: the feature check decides.
    expect(isIosSafari(SAFARI_NO_VERSION)).toBe(false);
    expect(isIosSafari(SAFARI_NO_VERSION, true)).toBe(true);
    expect(isIosSafari(SAFARI_18, true)).toBe(false);
    expect(isIosSafari(CHROME)).toBe(false);
    expect(isIosSafari(FIREFOX)).toBe(false);
    expect(isIosSafari(MAC_SAFARI)).toBe(false);
    expect(isIosSafari(ANDROID)).toBe(false);
  });

  it("the inline bootstrap agrees with the function", () => {
    for (const [ua, expected] of [
      [SAFARI, true],
      [SAFARI_18, false],
      [CHROME, false],
      [ANDROID, false],
    ] as const) {
      const dataset: Record<string, string> = {};
      const run = new Function(
        "navigator",
        "document",
        "CSS",
        SHELL_BOOTSTRAP,
      ) as (
        n: { userAgent: string },
        d: { documentElement: { dataset: Record<string, string> } },
        c: { supports: () => boolean },
      ) => void;
      run({ userAgent: ua }, { documentElement: { dataset } }, { supports: () => false });
      expect("iosSafari" in dataset).toBe(expected);
    }
  });
});
