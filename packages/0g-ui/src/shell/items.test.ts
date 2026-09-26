import { describe, expect, it } from "vitest";

import { isActive, MAX_ITEMS, type ShellItem } from "./items";

const Icon = () => null;
const swap: ShellItem = { href: "/swap", label: "Bridge & Swap", icon: Icon };
const explorer: ShellItem = {
  href: "https://chainscan.0g.ai",
  label: "Explorer",
  icon: Icon,
  external: true,
};

describe("isActive", () => {
  it("marks the item whose href the path is under, and only that one", () => {
    expect(isActive("/swap", swap)).toBe(true);
    expect(isActive("/swap/anything", swap)).toBe(true);
    expect(isActive("/discover", swap)).toBe(false);
    expect(isActive("/", swap)).toBe(false);
  });

  it("an outbound item is never active", () => {
    expect(isActive("https://chainscan.0g.ai", explorer)).toBe(false);
  });

  it("the tab bar's limit is the five the pill was measured with", () => {
    expect(MAX_ITEMS).toBe(5);
  });
});
