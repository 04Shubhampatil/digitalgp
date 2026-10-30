import { describe, expect, it } from "vitest";
import { collectMediaIds } from "@/features/media/references";

describe("media references in section data", () => {
  it("finds single ids and id lists at any depth", () => {
    const data = {
      heading: { en: "Gallery" },
      imageIds: ["aaaaaaaaaaaa1", "bbbbbbbbbbbb2"],
      items: [{ photoId: "cccccccccccc3", title: { en: "x" } }],
      fpo: { iconId: "dddddddddddd4" },
    };
    expect([...collectMediaIds(data)].sort()).toEqual(["aaaaaaaaaaaa1", "bbbbbbbbbbbb2", "cccccccccccc3", "dddddddddddd4"].sort());
  });

  it("ignores text fields that only look similar", () => {
    expect(collectMediaIds({ title: "Image", href: "/x", icon: "tax" }).size).toBe(0);
  });
});
