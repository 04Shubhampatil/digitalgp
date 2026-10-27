import { Phone, User } from "lucide-react";
import { pickText, type Bilingual } from "@/i18n/text";
import { publicMediaUrl } from "@/lib/api/public";
import type { SectionProps } from "./index";

interface LeadersData {
  heading?: Bilingual;
  items?: { name?: Bilingual; designation?: Bilingual; photoId?: string; phone?: string }[];
}

/** "Our Leaders" / members cards (CM, Dy CMs, ministers, Sarpanch …). */
export function LeadersSection({ slug, locale, data }: SectionProps) {
  const d = data as LeadersData;
  const items = d.items ?? [];
  if (items.length === 0) return null;
  const heading = pickText(d.heading, locale);

  return (
    <section className="bg-canvas py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {heading && <h2 className="text-center text-2xl font-bold text-ink md:text-3xl">{heading}</h2>}
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p, i) => {
            const photo = p.photoId ? publicMediaUrl(slug, p.photoId) : null;
            return (
              <li key={i} className="flex flex-col items-center rounded-card border border-line bg-surface p-5 text-center">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- backend-served media
                  <img src={photo} alt="" className="size-24 rounded-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex size-24 items-center justify-center rounded-full bg-success-soft text-primary">
                    <User className="size-10" aria-hidden />
                  </span>
                )}
                <p className="mt-3 font-semibold text-ink">{pickText(p.name, locale)}</p>
                <p className="text-xs text-muted">{pickText(p.designation, locale)}</p>
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
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
