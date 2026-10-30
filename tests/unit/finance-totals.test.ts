import { describe, expect, it } from "vitest";
import { financeTotals } from "@/features/finance/totals";

describe("finance totals", () => {
  it("sums income and expenditure exactly in paise", () => {
    expect(financeTotals(["12500.00", "0.10", "0.20"], ["5000.50", "1000.25"])).toEqual({
      totalIncome: "12500.30",
      totalExpenditure: "6000.75",
      surplus: "6499.55",
      utilisationPercent: 48,
    });
  });

  it("returns no utilisation when there is no income", () => {
    expect(financeTotals([], ["100.00"]).utilisationPercent).toBeNull();
    expect(financeTotals([], []).totalIncome).toBe("0.00");
  });

  it("reports a deficit as a negative surplus", () => {
    expect(financeTotals(["100.00"], ["150.00"]).surplus).toBe("-50.00");
  });
});
