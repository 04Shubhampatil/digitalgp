import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { pickText, type Bilingual } from "@/i18n/text";
import type { SectionProps } from "./index";

interface QuickLinksData {
  items?: { label?: Bilingual; href?: string; icon?: string }[];
}

/** Figma "Citizen Services" icon-card grid (quick links to services/forms). */
export function QuickLinksSection({ locale, data }: SectionProps) {
  const items = (data as QuickLinksData).items ?? [];
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item, i) => {
          const label = pickText(item.label, locale);
          const href = item.href ?? "#";
          const external = /^https?:\/\//.test(href);
          const body = (
            <>
              <span className="text-sm font-semibold text-ink">{label}</span>
              <ArrowUpRight className="size-4 text-primary" aria-hidden />
            </>
          );
          const cls =
            "flex h-28 flex-col items-center justify-center gap-2 rounded-card border border-line bg-surface p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary";
          return (
            <li key={i}>
              {external ? (
                <a href={href} target="_blank" rel="noopener" className={cls}>
                  {body}
                </a>
              ) : (
                <Link href={href} className={cls}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
