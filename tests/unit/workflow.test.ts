import { describe, expect, it } from "vitest";
import { assertEditable, nextStatus, transitionCapability } from "@/features/content/workflow";

describe("content workflow", () => {
  it("follows draft -> submitted -> under review -> approved -> published -> archived", () => {
    expect(nextStatus("DRAFT", "submit")).toBe("SUBMITTED");
    expect(nextStatus("SUBMITTED", "start_review")).toBe("UNDER_REVIEW");
    expect(nextStatus("UNDER_REVIEW", "approve")).toBe("APPROVED");
    expect(nextStatus("SUBMITTED", "approve")).toBe("APPROVED");
    expect(nextStatus("APPROVED", "publish")).toBe("PUBLISHED");
    expect(nextStatus("PUBLISHED", "archive")).toBe("ARCHIVED");
    expect(nextStatus("PUBLISHED", "unpublish")).toBe("APPROVED");
  });

  it("rejects invalid transitions", () => {
    expect(() => nextStatus("DRAFT", "publish")).toThrowError(/Cannot move content/);
    expect(() => nextStatus("DRAFT", "approve")).toThrow();
    expect(() => nextStatus("PUBLISHED", "submit")).toThrow();
    expect(() => nextStatus("ARCHIVED", "publish")).toThrow();
  });

  it("requires a note to reject and allows resubmission", () => {
    expect(() => nextStatus("SUBMITTED", "reject")).toThrowError(/note/);
    expect(nextStatus("SUBMITTED", "reject", "Missing Marathi title")).toBe("REJECTED");
    expect(nextStatus("REJECTED", "submit")).toBe("SUBMITTED");
  });

  it("maps actions to distinct capabilities (review and publish are separate)", () => {
    expect(transitionCapability("submit")).toBe("content:submit");
    expect(transitionCapability("approve")).toBe("content:review");
    expect(transitionCapability("publish")).toBe("content:publish");
    expect(transitionCapability("approve")).not.toBe(transitionCapability("publish"));
  });

  it("only draft and rejected content is editable", () => {
    expect(() => assertEditable("DRAFT")).not.toThrow();
    expect(() => assertEditable("REJECTED")).not.toThrow();
    expect(() => assertEditable("SUBMITTED")).toThrow();
    expect(() => assertEditable("PUBLISHED")).toThrow();
  });
});
