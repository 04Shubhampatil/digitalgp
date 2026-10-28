import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FigmaIcon, serviceIconName } from "@/components/ui/FigmaIcon";
import { pickText, type Bilingual } from "@/i18n/text";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "./index";

interface QuickLinksData {
  heading?: Bilingual;
  items?: { label?: Bilingual; href?: string; icon?: string }[];
  /** Last tile (Figma "View All Services"); defaults to the services page. */
  viewAll?: { label?: Bilingual; href?: string };
}

/** Figma "Citizen Services" (375:12910): centred heading + 6×2 grid of illustrated service tiles. */
export async function QuickLinksSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as QuickLinksData;
  const items = d.items ?? [];
  if (items.length === 0) return null;
  const all = { label: pickText(d.viewAll?.label, locale) || t("viewAllServices"), href: d.viewAll?.href ?? `/${slug}/services` };
  const tiles = [
    ...items.map((item) => ({
      label: pickText(item.label, locale),
      icon: item.icon ?? serviceIconName(`${item.label?.en ?? ""} ${item.href ?? ""}`),
      href: resolveHref(item.href ?? "#", slug),
    })),
    { label: all.label, icon: "svc-all-services", href: resolveHref(all.href, slug) },
  ];
  const cls =
    "flex min-h-[162px] flex-col items-center justify-start gap-2 rounded-[10px] border border-black/15 bg-white px-2 pt-6 pb-4 text-center shadow-[0_0_20px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5";
  return (
    <section className="bg-cream pt-[104px] pb-8 max-lg:pt-12">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale) || t("services")}</h2>
        <ul className="mt-[12px] grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {tiles.map((tile, i) => {
            const external = /^https?:\/\//.test(tile.href);
            const body = (
              <>
                <FigmaIcon name={tile.icon} width={tile.icon === "svc-aadhar" ? 102 : 73} height={tile.icon === "svc-aadhar" ? 76 : 73} />
                <span className="text-[16px] leading-[22px] font-semibold text-black">{tile.label}</span>
              </>
            );
            return (
              <li key={i}>
                {external ? (
                  <a href={tile.href} target="_blank" rel="noopener" className={cls}>
                    {body}
                  </a>
                ) : (
                  <Link href={tile.href} className={cls}>
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
