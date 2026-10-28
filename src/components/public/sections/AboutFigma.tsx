import { Phone } from "lucide-react";
import Link from "next/link";
import { FigmaIcon } from "@/components/ui/FigmaIcon";
import { pickText, type Bilingual } from "@/i18n/text";
import { resolveHref } from "@/lib/href";
import type { SectionProps } from "./index";

type B = Bilingual | undefined;
interface Btn {
  label?: Bilingual;
  href?: string;
}

/**
 * About-page blocks from the Figma design (file qBVt7yv0KG41onObVWfnP1, "2. About us"). These are
 * frontend placeholder sections fed by src/content/figma-about.ts until the backend registry gets
 * matching section keys.
 */


/**
 * `about-hero` / `page-hero`: eyebrow, heading (optional green accent, default the village name),
 * paragraph, pill buttons (first filled) and photo on the right. Shared by every inner page.
 */
export function AboutHeroSection({ slug, locale, data, tenantName }: SectionProps) {
  const d = data as { eyebrow?: B; title?: B; titleAccent?: B; noTenantName?: boolean; body?: B; primary?: Btn; secondary?: Btn; actions?: Btn[]; imageUrl?: string };
  const buttons = (d.actions?.length ? d.actions : [d.primary, d.secondary]).filter((b): b is Btn => !!b?.href);
  const accent = pickText(d.titleAccent, locale) || (d.noTenantName ? "" : (tenantName ?? ""));
  return (
    <section className="overflow-hidden bg-cream">
      <div className="mx-auto grid max-w-[1440px] items-center gap-8 px-4 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-[62px]">
        <div className="flex flex-col gap-10 py-12 lg:py-0">
          <div className="flex flex-col gap-8">
            <p className="text-[22px] font-semibold text-[#ea7f14] uppercase">{pickText(d.eyebrow, locale)}</p>
            <h1 className="max-w-[547px] text-[36px] leading-[50px] font-bold text-black lg:text-[40px]">
              {pickText(d.title, locale)} {accent && <span className="text-[#135130]">{accent}</span>}
            </h1>
          </div>
          <p className="max-w-[491px] text-[15px] leading-[25px] text-[#414141]">{pickText(d.body, locale)}</p>
          <div className="flex flex-wrap items-center gap-2">
            {buttons.map((b, i) => (
              <Link
                key={i}
                href={resolveHref(b.href ?? "#", slug)}
                className={
                  i === 0
                    ? "inline-flex rounded-full border border-[#135130] bg-[#135130] px-4 py-2 text-[12.5px] font-medium text-white hover:opacity-90"
                    : "inline-flex rounded-full border-[0.6px] border-[#135130] px-4 py-2 text-[13.5px] text-[#135130] hover:bg-[#135130]/5"
                }
              >
                {pickText(b.label, locale)}
              </Link>
            ))}
          </div>
        </div>
        <div className="relative h-[300px] sm:h-[420px] lg:h-[539px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
          <img src={d.imageUrl ?? "/images/figma/about-hero.png"} alt="" className="absolute inset-0 size-full object-cover object-right" />
        </div>
      </div>
    </section>
  );
}

/** `about-history`: village history text, two info cards and the photo / map collage. */
export function AboutHistorySection({ locale, data }: SectionProps) {
  const d = data as { eyebrow?: B; heading?: B; body?: B; cards?: { title?: B; body?: B }[]; photos?: string[]; mapUrl?: string; address?: B };
  const photos = d.photos ?? ["/images/figma/about-road.png", "/images/figma/about-aerial.png", "/images/figma/about-map.png"];
  return (
    <section className="bg-cream py-10">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 sm:px-8 lg:grid-cols-2 lg:px-[62px]">
        <div>
          <p className="text-[22px] font-semibold text-[#ea7f14] uppercase">{pickText(d.eyebrow, locale)}</p>
          <h2 className="mt-3 max-w-[536px] text-[36px] leading-[50px] font-bold text-black lg:text-[45px]">{pickText(d.heading, locale)}</h2>
          <p className="mt-6 max-w-[540px] text-[15px] leading-[25px] text-[#414141]">{pickText(d.body, locale)}</p>
          <div className="mt-8 flex flex-wrap gap-5">
            {(d.cards ?? []).map((c, i) => (
              <div key={i} className="w-full max-w-[315px] rounded-[10px] border border-black/15 bg-white px-5 py-5 shadow-[0_0_10px_rgba(0,0,0,0.1)]">
                <p className="text-[18px] leading-[26px] font-bold text-[#135130]">{pickText(c.title, locale)}</p>
                <p className="mt-2 text-[14px] leading-[24px] whitespace-pre-line text-[#414141]">{pickText(c.body, locale)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-5">
          {/* eslint-disable @next/next/no-img-element -- static design assets */}
          <div className="h-[260px] overflow-hidden rounded-[8px] bg-white lg:h-[309px]">
            <img src={photos[0]} alt="" className="size-full object-cover" loading="lazy" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="h-[260px] overflow-hidden rounded-[8px] bg-white lg:h-[309px]">
              <img src={photos[1]} alt="" className="size-full object-cover" loading="lazy" />
            </div>
            <div className="relative h-[260px] overflow-hidden rounded-[8px] bg-[#f93] lg:h-[309px]">
              <img src={photos[2]} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
              {pickText(d.address, locale) && (
                <p className="absolute inset-x-0 bottom-0 rounded-t-[12px] bg-cream/90 px-5 py-4 text-[9.3px] leading-[16.7px] font-medium text-black">{pickText(d.address, locale)}</p>
              )}
            </div>
          </div>
          {/* eslint-enable @next/next/no-img-element */}
        </div>
      </div>
    </section>
  );
}

/** `about-structure`: panchayat structure org chart card + green office information card. */
export function AboutStructureSection({ locale, data }: SectionProps) {
  const d = data as {
    eyebrow?: B;
    heading?: B;
    members?: { role?: B; title?: B; body?: B; accent?: string }[];
    office?: { eyebrow?: B; heading?: B; addressLabel?: B; address?: B; hoursLabel?: B; hours?: B; phoneLabel?: B; phone?: string; emailLabel?: B; email?: string };
  };
  const o = d.office ?? {};
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 sm:px-8 lg:grid-cols-[746px_minmax(0,1fr)] lg:px-[62px]">
        <div className="rounded-[11.5px] bg-white p-7 shadow-[0_0_23px_rgba(0,0,0,0.25)]">
          <p className="text-[18px] font-semibold text-[#135130] uppercase">{pickText(d.eyebrow, locale)}</p>
          <h2 className="mt-1 text-[34px] leading-[58px] font-bold text-black">{pickText(d.heading, locale)}</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {(d.members ?? []).map((m, i) => (
              <li key={i} className="flex gap-3 rounded-[10px] border border-black/15 bg-white p-3 shadow-sm" style={{ borderTop: `3px solid ${m.accent ?? "#f38c28"}` }}>
                <span className="relative block h-[146px] w-[122px] shrink-0 overflow-hidden rounded-[8px] bg-[#f4f1ea]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
                  <img src="/images/figma/about-person.png" alt="" className="absolute top-0 -left-[30px] h-[145px] w-[182px] max-w-none object-cover" loading="lazy" />
                </span>
                <div>
                  <p className="text-[15px] font-bold text-[#f38c28] uppercase">{pickText(m.role, locale)}</p>
                  <p className="mt-2 text-[15.5px] leading-[21px] font-bold text-black">{pickText(m.title, locale)}</p>
                  <p className="mt-2 text-[11.6px] leading-[19px] text-[#414141]">{pickText(m.body, locale)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[14px] border border-[#135130] bg-[#135130] p-8 text-white">
          <p className="text-[15px] font-bold uppercase">{pickText(o.eyebrow, locale)}</p>
          <h2 className="mt-2 text-[38px] leading-[50px] font-bold">{pickText(o.heading, locale)}</h2>
          <dl className="mt-5 divide-y divide-white/40 text-[16.5px]">
            <div className="py-4">
              <dt className="text-[15px] font-bold">{pickText(o.addressLabel, locale)}</dt>
              <dd className="mt-2 font-medium">{pickText(o.address, locale)}</dd>
            </div>
            <div className="py-4">
              <dt className="text-[15px] font-bold">{pickText(o.hoursLabel, locale)}</dt>
              <dd className="mt-2 font-medium whitespace-pre-line">{pickText(o.hours, locale)}</dd>
            </div>
            <div className="py-4">
              <dt className="text-[15px] font-bold">{pickText(o.phoneLabel, locale)}</dt>
              <dd className="mt-2">
                <a href={`tel:${o.phone}`} className="hover:underline">
                  {o.phone}
                </a>
              </dd>
            </div>
            <div className="py-4">
              <dt className="text-[15px] font-bold">{pickText(o.emailLabel, locale)}</dt>
              <dd className="mt-2 break-all">
                <a href={`mailto:${o.email}`} className="hover:underline">
                  {o.email}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

/** `about-roles`: "What Panchayat officials do" — six numbered cards. */
export function AboutRolesSection({ locale, data }: SectionProps) {
  const d = data as { eyebrow?: B; heading?: B; items?: { title?: B; body?: B }[] };
  return (
    <section className="bg-cream py-10">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <p className="text-center text-[20px] font-semibold text-[#135130] uppercase">{pickText(d.eyebrow, locale)}</p>
        <h2 className="mt-2 text-center text-[35px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        <ul className="mt-10 grid gap-[26px] md:grid-cols-2 lg:grid-cols-3">
          {(d.items ?? []).map((it, i) => (
            <li key={i} className="min-h-[246px] rounded-[13.5px] bg-white px-7 py-10 shadow-[0_0_27px_rgba(0,0,0,0.25)]">
              <span className="inline-flex h-[49px] w-[54px] items-center justify-center rounded-full bg-[rgba(243,140,40,0.09)] text-[24px] font-bold text-[#f38c28]">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 text-[21.6px] leading-[34px] font-bold text-black">{pickText(it.title, locale)}</h3>
              <p className="mt-3 text-[16.2px] leading-[27px] text-[#414141]">{pickText(it.body, locale)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const EMERGENCY_ICONS = ["total", "ambulance", "fire", "health", "disaster", "electricity", "tollfree", "forest", "state", "women"];

/** `about-emergency`: important contact numbers grid with call pills. */
export function AboutEmergencySection({ locale, data }: SectionProps) {
  const d = data as { eyebrow?: B; heading?: B; items?: { label?: B; numbers?: string[] }[] };
  return (
    <section className="bg-[rgba(34,138,83,0.05)] py-8">
      <div className="mx-auto max-w-[1326px] px-4 sm:px-8">
        <p className="text-center text-[20px] font-semibold text-[#135130] uppercase">{pickText(d.eyebrow, locale)}</p>
        <h2 className="mt-3 text-center text-[35px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        <ul className="mt-8 flex flex-wrap justify-center gap-5">
          {(d.items ?? []).map((it, i) => {
            const icon = EMERGENCY_ICONS[i % EMERGENCY_ICONS.length]!;
            return (
              <li key={i} className="flex min-h-[199px] w-[203px] flex-col items-center gap-4 rounded-[10px] border border-black/15 bg-white px-6 py-6 shadow-[0_0_10px_rgba(0,0,0,0.25)]">
                <FigmaIcon name={`emerg-${icon}`} width={88} height={76} />
                <p className="text-center text-[14.8px] leading-4 font-semibold text-black">{pickText(it.label, locale)}</p>
                <div className="mt-auto flex flex-wrap justify-center gap-2">
                  {(it.numbers ?? []).map((n) => (
                    <a key={n} href={`tel:${n.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 rounded-[8px] border-[0.8px] border-[#138808] px-2 py-1 text-[12.8px] font-extrabold whitespace-nowrap text-[#138808] hover:bg-[#138808]/5">
                      <Phone className="size-4 -rotate-90" aria-hidden /> {n}
                    </a>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** `about-vision`: green band with vision, mission and core values cards over the village photo. */
export function AboutVisionSection({ locale, data }: SectionProps) {
  const d = data as { visionLabel?: B; vision?: B; visionBody?: B; missionLabel?: B; mission?: B; valuesLabel?: B; values?: B[] };
  return (
    <section className="bg-cream py-8">
      <div className="relative mx-auto max-w-[1324px] overflow-hidden rounded-[10px] bg-[#135130]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
        <img src="/images/figma/about-vision.png" alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        <div aria-hidden className="absolute inset-0 bg-[rgba(19,81,48,0.9)]" />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_313px_313px] lg:px-[110px] lg:py-[23px]">
          <div className="flex flex-col justify-center gap-6 py-6 lg:pr-10">
            <p className="text-[22px] font-semibold text-[#f3d828]">{pickText(d.visionLabel, locale)}</p>
            <p className="text-[35px] leading-[50px] font-bold text-white">{pickText(d.vision, locale)}</p>
            <p className="text-[14px] text-white">{pickText(d.visionBody, locale)}</p>
          </div>
          <div className="rounded-[10px] border border-white/20 bg-white/10 p-6">
            <p className="text-[22px] font-semibold text-[#f3d828]">{pickText(d.missionLabel, locale)}</p>
            <p className="mt-6 text-[14px] leading-6 text-white">{pickText(d.mission, locale)}</p>
          </div>
          <div className="rounded-[10px] border border-white/20 bg-white/10 p-6">
            <p className="text-[22px] font-semibold text-[#f3d828]">{pickText(d.valuesLabel, locale)}</p>
            <ul className="mt-6 list-disc space-y-1 pl-5 text-[14px] leading-6 text-white">
              {(d.values ?? []).map((v, i) => (
                <li key={i}>{pickText(v, locale)}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
