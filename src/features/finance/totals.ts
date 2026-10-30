/**
 * Overview figures for the Budget Visualizer, computed from the published Income and Expenditure
 * categories (never typed in). Amounts are decimal strings such as "12500.00"; sums use integer
 * paise (cents) so totals are exact.
 *
 * Rule used by the public page: a "dynamic" overview field shows the total income or expenditure;
 * an "auto" field shows the surplus, or utilisation % when its suffix is "%".
 */
export interface FinanceTotals {
  totalIncome: string;
  totalExpenditure: string;
  surplus: string;
  /** Expenditure as a percentage of income, one decimal; null when there is no income. */
  utilisationPercent: number | null;
}

const toCents = (amount: string): number => Math.round(Number(amount) * 100);
const fromCents = (cents: number): string => (cents / 100).toFixed(2);

export function financeTotals(incomeAmounts: string[], expenditureAmounts: string[]): FinanceTotals {
  const income = incomeAmounts.reduce((sum, a) => sum + toCents(a), 0);
  const expenditure = expenditureAmounts.reduce((sum, a) => sum + toCents(a), 0);
  return {
    totalIncome: fromCents(income),
    totalExpenditure: fromCents(expenditure),
    surplus: fromCents(income - expenditure),
    utilisationPercent: income > 0 ? Math.round((expenditure / income) * 1000) / 10 : null,
  };
}
