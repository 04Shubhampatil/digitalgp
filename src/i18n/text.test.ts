import { describe, expect, it } from "vitest";
import { localizeDate, marathiDate, pickText } from "./text";

describe("marathiDate", () => {
  it("turns English day-month-year text into a Marathi date", () => {
    expect(marathiDate("05 Nov 2025")).toBe("५ नोव्हेंबर, २०२५");
    expect(marathiDate("25 Sept 2025")).toBe("२५ सप्टेंबर, २०२५");
    expect(marathiDate("May 10, 2024")).toBe("१० मे, २०२४");
  });

  it("leaves anything else alone", () => {
    expect(marathiDate("Monday to Friday")).toBeNull();
    expect(marathiDate("31 Feb 2025")).toBeNull();
    expect(marathiDate("Phase 2 2025")).toBeNull();
    expect(marathiDate("")).toBeNull();
  });

  it("only changes dates in the Marathi UI", () => {
    expect(localizeDate("05 Nov 2025", "en")).toBe("05 Nov 2025");
    expect(localizeDate("05 Nov 2025", "mr")).toBe("५ नोव्हेंबर, २०२५");
    expect(localizeDate("Soon", "mr")).toBe("Soon");
    expect(localizeDate(undefined, "mr")).toBe("");
  });

  it("pickText shows an English-only date in Marathi when the UI is Marathi", () => {
    expect(pickText({ en: "05 Nov 2025" }, "mr")).toBe("५ नोव्हेंबर, २०२५");
    expect(pickText({ en: "05 Nov 2025", mr: "०५ नोव्हें २०२५" }, "mr")).toBe("०५ नोव्हें २०२५");
  });
});
