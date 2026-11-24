import { SectionHighlight } from "@/components/public/SectionHighlight";
import type { Metadata } from "next";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { getPublicTenant } from "@/lib/api/public";
import { loadTenant } from "@/lib/public-tenant";

type Params = Promise<{ tenant: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tenant: slug } = await params;
  try {
    const tenant = await getPublicTenant(slug);
    return {
      title: { default: `${tenant.nameEn} Gram Panchayat`, template: `%s · ${tenant.nameEn} Gram Panchayat` },
      description: tenant.settings.seo?.description?.en ?? undefined,
    };
  } catch {
    return {};
  }
}

export default async function TenantLayout({ children, params }: { children: React.ReactNode; params: Params }) {
  const { tenant: slug } = await params;
  const tenant = await loadTenant(slug);
  return (
    <div className="public-site flex min-h-dvh flex-col bg-surface">
      <PublicHeader tenant={tenant} />
      {/* The Figma About page ends with the leaders band flush against the footer; every other page keeps the footer's 64px top margin. */}
      <div className="flex-1 lg:has-[#leaders:last-child]:-mb-16">{children}</div>
      <PublicFooter tenant={tenant} />
      <SectionHighlight />
    </div>
  );
}
