import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import * as shell from "../../../packages/0g-ui/src/shell/index";
import { checkRegistry, type Registry } from "./registry";

const registry = JSON.parse(
  readFileSync(new URL("../../../consumers.json", import.meta.url), "utf8"),
) as Registry;

describe("consumers.json", () => {
  it("names real sites and the package's own icons", () => {
    expect(checkRegistry(registry, shell as unknown as Record<string, unknown>)).toEqual([]);
  });

  it("catches an icon the package does not export and a tab bar over groups", () => {
    const broken: Registry = {
      consumers: [
        {
          ...registry.consumers[0],
          header: {
            ...registry.consumers[0].header,
            items: [
              { href: "/a", label: "A", icon: "NoSuchIcon" },
              { label: "G", sections: [] },
            ],
          },
          tabBar: { label: "Main" },
        },
      ],
    };
    expect(checkRegistry(broken, shell as unknown as Record<string, unknown>)).toEqual([
      `consumers.json ${registry.consumers[0].name}: icon NoSuchIcon is not an export of @0gfoundation/0g-ui/shell`,
      `consumers.json ${registry.consumers[0].name}: a tab bar takes links only, and the items hold groups`,
    ]);
  });
});
