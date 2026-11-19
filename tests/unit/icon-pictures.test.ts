import { describe, expect, it } from "vitest";
import { withIconPictures } from "@/lib/icon-pictures";

describe("uploaded icon pictures reach the renderers", () => {
  it("turns iconImageId into the picture address every card reads, at any depth", () => {
    const out = withIconPictures({ items: [{ title: "A", iconImageId: "abcdefghij1" }, { title: "B" }], nested: { cards: [{ iconImageId: "abcdefghij2" }] } }, "savardari") as {
      items: { iconImage?: string; iconUrl?: string }[];
      nested: { cards: { iconImage?: string }[] };
    };
    expect(out.items[0]!.iconImage).toContain("abcdefghij1");
    expect(out.items[0]!.iconUrl).toBe(out.items[0]!.iconImage);
    expect(out.nested.cards[0]!.iconImage).toContain("abcdefghij2");
  });

  it("leaves a card without an upload as it is (design picture or icon name stay)", () => {
    const card = { title: "B", iconImage: "/images/figma/pages/x.png", icon: "tree" };
    const out = withIconPictures({ items: [card] }, "savardari") as { items: (typeof card)[] };
    expect(out.items[0]).toEqual(card);
  });

  it("does not change non-object values", () => {
    expect(withIconPictures("text", "savardari")).toBe("text");
    expect(withIconPictures(null, "savardari")).toBeNull();
    expect(withIconPictures([1, 2], "savardari")).toEqual([1, 2]);
  });
});
