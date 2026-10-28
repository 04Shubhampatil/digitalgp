import { Phone, User } from "lucide-react";
import { pickText, type Bilingual } from "@/i18n/text";
import { publicMediaUrl } from "@/lib/api/public";
import type { SectionProps } from "./index";

interface LeaderItem {
  name?: Bilingual;
  designation?: Bilingual;
  /** Second line under the designation (e.g. "State of Maharashtra"). */
  organization?: Bilingual;
  photoId?: string;
  /** Static design photo used until a photo is uploaded. */
  photoUrl?: string;
  phone?: string;
}

interface LeadersData {
  heading?: Bilingual;
  /** Highlighted (green) last word of the heading, e.g. "Leaders". */
  headingAccent?: Bilingual;
  subheading?: Bilingual;
  items?: LeaderItem[];
}

/** "Our Leaders" cards (Figma 375:12821): orange top edge, framed photo, name, role, organisation. */
export function LeadersSection({ slug, locale, data }: SectionProps) {
  const d = data as LeadersData;
  const items = d.items ?? [];
  if (items.length === 0) return null;
  const heading = pickText(d.heading, locale);
  const accent = pickText(d.headingAccent, locale);
  const subheading = pickText(d.subheading, locale);

  return (
    <section className="bg-[rgba(34,138,83,0.05)] py-[30px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[55px]">
        {(heading || accent) && (
          <h2 className="text-center text-[30px] leading-[41px] font-semibold text-black">
            {heading} {accent && <span className="text-[#138808]">{accent}</span>}
          </h2>
        )}
        {subheading && <p className="mt-3 text-center text-[20px] leading-[28px] text-black">{subheading}</p>}
        <ul className="mt-9 flex flex-wrap justify-center gap-[15px]">
          {items.map((p, i) => {
            const photo = p.photoId ? publicMediaUrl(slug, p.photoId) : (p.photoUrl ?? null);
            return (
              <li
                key={i}
                className="flex w-full max-w-[320px] flex-col items-stretch gap-[18px] rounded-[7.5px] border-t-[6.8px] border-[#f93] bg-white px-[27px] py-[22px] shadow-[0_0_15px_3.8px_rgba(0,0,0,0.25)]"
              >
                <div className="h-[218px] overflow-hidden rounded-[7.5px] border border-black/15 bg-white">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- backend-served media / static design asset
                    <img src={photo} alt="" className="size-full object-cover object-top" loading="lazy" />
                  ) : (
                    <span className="flex size-full items-center justify-center bg-success-soft text-primary">
                      <User className="size-16" aria-hidden />
                    </span>
                  )}
                </div>
                <p className="text-center text-[18px] leading-[16px] font-bold text-black">{pickText(p.name, locale)}</p>
                <p className="text-center text-[15px] leading-[21px] text-black">{pickText(p.designation, locale)}</p>
                {p.organization && <p className="text-center text-[15px] leading-[16px] text-[#414141]">{pickText(p.organization, locale)}</p>}
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="inline-flex items-center justify-center gap-1 text-xs text-primary hover:underline">
                    <Phone className="size-3" aria-hidden /> {p.phone}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
