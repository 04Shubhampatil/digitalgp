import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { pickText, type Bilingual } from "@/i18n/text";
import { publicMediaUrl } from "@/lib/api/public";
import type { SectionProps } from "./index";

/** `history`: heading + long text. */
export function HistorySection({ locale, data }: SectionProps) {
  const d = data as { heading?: Bilingual; body?: Bilingual };
  const body = pickText(d.body, locale);
  if (!body) return null;
  return (
    <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h2 className="text-2xl font-bold text-ink md:text-3xl">{pickText(d.heading, locale)}</h2>
      <p className="mt-4 leading-relaxed whitespace-pre-line text-muted">{body}</p>
    </section>
  );
}

/** `geography`: figures as stat tiles + description. */
export function GeographySection({ locale, data }: SectionProps) {
  const d = data as { areaSqKm?: number; population?: number; households?: number; wards?: number; pinCode?: string; nearestCity?: Bilingual; description?: Bilingual };
  const labels: Record<string, string> = locale === "mr"
    ? { areaSqKm: "क्षेत्रफळ (चौ.किमी)", population: "लोकसंख्या", households: "घरसंख्या", wards: "वॉर्ड", pinCode: "पिन कोड", nearestCity: "जवळचे शहर" }
    : { areaSqKm: "Area (sq. km)", population: "Population", households: "Households", wards: "Wards", pinCode: "PIN code", nearestCity: "Nearest city" };
  const tiles: [string, string | number | undefined][] = [
    ["population", d.population],
    ["households", d.households],
    ["wards", d.wards],
    ["areaSqKm", d.areaSqKm],
    ["pinCode", d.pinCode],
    ["nearestCity", pickText(d.nearestCity, locale) || undefined],
  ];
  const shown = tiles.filter(([, v]) => v !== undefined && v !== "");
  const description = pickText(d.description, locale);
  if (shown.length === 0 && !description) return null;
  return (
    <section className="bg-canvas py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {shown.length > 0 && (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {shown.map(([k, v]) => (
              <div key={k} className="rounded-card border border-line bg-surface p-4 text-center">
                <dd className="text-xl font-bold text-ink">{typeof v === "number" ? v.toLocaleString(locale === "mr" ? "mr-IN" : "en-IN") : v}</dd>
                <dt className="mt-1 text-[11px] text-muted">{labels[k]}</dt>
              </div>
            ))}
          </dl>
        )}
        {description && <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed whitespace-pre-line text-muted">{description}</p>}
      </div>
    </section>
  );
}

/** `members`: panchayat members with ward numbers. */
export function MembersSection({ slug, locale, data }: SectionProps) {
  const d = data as { heading?: Bilingual; items?: { name?: Bilingual; designation?: Bilingual; wardNo?: string; phone?: string; photoId?: string }[] };
  const items = d.items ?? [];
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <h2 className="text-center text-2xl font-bold text-ink md:text-3xl">{pickText(d.heading, locale)}</h2>
      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m, i) => (
          <li key={i} className="flex items-center gap-4 rounded-card border border-line bg-surface p-4">
            {m.photoId ? (
              // eslint-disable-next-line @next/next/no-img-element -- backend-served media
              <img src={publicMediaUrl(slug, m.photoId)} alt="" className="size-16 shrink-0 rounded-full object-cover" loading="lazy" />
            ) : (
              <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-success-soft text-lg font-bold text-primary">{pickText(m.name, locale).charAt(0)}</span>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-ink">{pickText(m.name, locale)}</p>
              <p className="text-xs text-muted">
                {pickText(m.designation, locale)}
                {m.wardNo ? ` · ${locale === "mr" ? "वॉर्ड" : "Ward"} ${m.wardNo}` : ""}
              </p>
              {m.phone && (
                <a href={`tel:${m.phone}`} className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <Phone className="size-3" aria-hidden /> {m.phone}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** `office`: address, hours, phone, email, map link. */
export function OfficeSection({ locale, data }: SectionProps) {
  const d = data as { address?: Bilingual; hours?: Bilingual; phone?: string; email?: string; mapUrl?: string };
  const address = pickText(d.address, locale);
  if (!address && !d.phone && !d.email) return null;
  const title = locale === "mr" ? "कार्यालय माहिती" : "Office information";
  return (
    <section className="bg-primary-deep py-14 text-cream">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {address && (
            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <dd className="whitespace-pre-line">{address}</dd>
            </div>
          )}
          {pickText(d.hours, locale) && (
            <div className="flex gap-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <dd>{pickText(d.hours, locale)}</dd>
            </div>
          )}
          {d.phone && (
            <div className="flex gap-3">
              <Phone className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <dd>
                <a href={`tel:${d.phone}`} className="hover:underline">
                  {d.phone}
                </a>
              </dd>
            </div>
          )}
          {d.email && (
            <div className="flex gap-3">
              <Mail className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <dd>
                <a href={`mailto:${d.email}`} className="hover:underline">
                  {d.email}
                </a>
              </dd>
            </div>
          )}
        </dl>
        {d.mapUrl && (
          <a href={d.mapUrl} target="_blank" rel="noopener" className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary hover:bg-cream">
            {locale === "mr" ? "नकाशात उघडा" : "Open in Maps"}
          </a>
        )}
      </div>
    </section>
  );
}
