import { publishedSectionData } from "@/lib/published-section";
import { getPublicTenantBySlug } from "@/lib/tenant";
import { financeTotals, type FinanceTotals } from "@/features/finance/totals";

type Category = { amount?: string };

/**
 * Public Budget Visualizer figures, computed from the published Income and Expenditure sections.
 * Drafts never count. Unpublished or missing sections contribute nothing.
 */
export async function getPublicFinanceSummary(tenantSlug: string): Promise<FinanceTotals & { generatedAt: string }> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const income = (await publishedSectionData(tenant.id, "finance", "income-sources")) as { categories?: Category[] } | null;
  const expenditure = (await publishedSectionData(tenant.id, "finance", "expenditure")) as { categories?: Category[] } | null;
  const amounts = (list: Category[] | undefined) => (list ?? []).map((c) => c.amount ?? "0");
  return { ...financeTotals(amounts(income?.categories), amounts(expenditure?.categories)), generatedAt: new Date().toISOString() };
}
