import { Phone } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
  const d = data as {
    eyebrow?: B;
    title?: B;
    titleAccent?: B;
    /** Start the green accent on its own line (as some Figma heroes do). */ accentBlock?: boolean;
    noTenantName?: boolean;
    body?: B;
    primary?: Btn;
    secondary?: Btn;
    actions?: Btn[];
    imageUrl?: string;
    /**
     * Opt-in (Our Village, Employment, …): the cut-out picture sits at its Figma position and natural size and runs to
     * the right edge. `true` = Our Village (x=592, 848×533, 513px hero); an object gives the frame's own numbers.
     */
    imageBleed?: boolean | { left: number; width: number; height: number; section?: number; /** Height the text block is centred in (default 513). */ textBox?: number };
    /** Opt-in with imageBleed: 45px heading (Gallery, Contact) instead of 40px. */
    titleLarge?: boolean;
    /** Opt-in with imageBleed: eyebrow as typed (Grievance) instead of upper case. */
    eyebrowAsTyped?: boolean;
    /** Opt-in: the heading as runs of text, `accent` runs in green (Figma heroes that colour words mid-sentence). */
    titleParts?: { text?: B; accent?: boolean }[];
    /** Opt-in with imageBleed: space between the heading and the paragraph (default 40px; Key Projects uses 24px). */
    bodyGap?: number;
    /** Opt-in: every sentence of the heading on its own line, the accent last (Services, Announcements, Schemes). */
    titleLines?: boolean;
  };
  const buttons = (d.actions?.length ? d.actions : [d.primary, d.secondary]).filter((b): b is Btn => !!b?.href);
  const rawTitle = pickText(d.title, locale);
  // A published heading may already contain the village name: render it once, in green, where it is.
  const nameAt = tenantName && !d.titleAccent && !d.titleParts ? rawTitle.indexOf(tenantName) : -1;
  const accent = nameAt >= 0 ? "" : pickText(d.titleAccent, locale) || (d.noTenantName ? "" : (tenantName ?? ""));
  const titleNode: React.ReactNode =
    nameAt >= 0 ? (
      <>
        {rawTitle.slice(0, nameAt)}
        <span className="text-[#135130]">{tenantName}</span>
        {rawTitle.slice(nameAt + tenantName!.length)}
      </>
    ) : null;
  if (d.imageBleed) {
    const box = d.imageBleed === true ? { left: 592, width: 848, height: 533, section: 513 } : d.imageBleed;
    const textBox = (d.imageBleed !== true && d.imageBleed.textBox) || 513;
    const vars = { "--hx": `${box.left}px`, "--hw": `${box.width}px`, "--hh": `${box.height}px`, "--hs": `${box.section ?? box.height}px`, "--ht": `${textBox}px` } as React.CSSProperties;
    // A run is shown in the language it is written in only (word order differs between English and Marathi, so
    // a run left empty for one language is skipped there); runs are separated by a space.
    const parts = (d.titleParts ?? []).map((p) => ({ accent: p.accent, text: (p.text?.[locale] ?? "").trim() })).filter((p) => p.text);
    return (
      <section style={vars} className="relative z-[1] overflow-x-clip bg-cream lg:h-[var(--hs)]">
        <div className="relative mx-auto h-full max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
          <div className="relative z-[1] flex max-w-[491px] flex-col justify-center gap-10 py-12 lg:h-[var(--ht)] lg:py-0">
            <div className="flex flex-col gap-8">
              <p className={`text-[17px] font-semibold text-[#ea7f14] sm:text-[22px] sm:whitespace-nowrap ${d.eyebrowAsTyped ? "" : "uppercase"}`}>{pickText(d.eyebrow, locale)}</p>
              <h1 className={`text-[36px] leading-[50px] font-bold text-black lg:w-[547px] ${d.titleLarge ? "lg:text-[45px]" : "lg:text-[40px]"}`}>
                {parts.length > 0 ? (
                  parts.map((p, i) => (
                    <span key={i} className={p.accent ? "text-[#135130]" : undefined}>
                      {i > 0 ? " " : ""}
                      {p.text}
                    </span>
                  ))
                ) : (
                  (titleNode ??
                  (d.titleLines ? (
                    <>
                      {rawTitle
                        .split(/(?<=[.!?])\s+/)
                        .filter(Boolean)
                        .map((line, i) => (
                          <span key={i} className="block">
                            {line}
                          </span>
                        ))}
                      {accent && <span className="block text-[#135130]">{accent}</span>}
                    </>
                  ) : (
                    <>
                      {rawTitle} {accent && <span className="text-[#135130]">{accent}</span>}
                    </>
                  )))
                )}
              </h1>
            </div>
            <p className="text-[15px] leading-[25px] text-[#414141]" style={d.bodyGap != null ? { marginTop: d.bodyGap - 40 } : undefined}>
              {pickText(d.body, locale)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {buttons.map((b, i) => (
                <Link
                  key={i}
                  href={resolveHref(b.href ?? "#", slug)}
                  className={
                    i === 0
                      ? "inline-flex rounded-full border border-[#135130] bg-[#135130] px-4 py-2 text-[12.5px] font-semibold text-white hover:opacity-90"
                      : "inline-flex rounded-full border-[0.6px] border-[#135130] bg-white/10 px-4 py-2 text-[13.5px] font-semibold text-[#135130] hover:bg-[#135130]/5"
                  }
                >
                  {pickText(b.label, locale)}
                </Link>
              ))}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
          <img
            src={d.imageUrl ?? "/images/figma/about-hero.png"}
            alt=""
            className="mt-2 h-auto w-full lg:absolute lg:top-0 lg:left-[var(--hx)] lg:mt-0 lg:h-[var(--hh)] lg:w-[var(--hw)] lg:max-w-none"
          />
        </div>
      </section>
    );
  }
  return (
    <section className="overflow-hidden bg-cream">
      <div className="mx-auto grid max-w-[1440px] items-center gap-8 px-4 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:px-[62px]">
        <div className="flex flex-col gap-10 py-12 lg:py-0">
          <div className="flex flex-col gap-8">
            <p className="text-[22px] font-semibold text-[#ea7f14] uppercase">{pickText(d.eyebrow, locale)}</p>
            <h1 className="max-w-[547px] text-[36px] leading-[50px] font-bold text-black lg:text-[40px]">
              {titleNode ?? (
                <>
                  {rawTitle} {accent && <span className={d.accentBlock ? "block text-[#135130]" : "text-[#135130]"}>{accent}</span>}
                </>
              )}
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
        <div className="relative flex items-center lg:-mr-[62px]">
          {/* Natural aspect, never cropped (a published photo or the Figma torn-edge picture). */}
          {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
          <img src={d.imageUrl ?? "/images/figma/pages/about-hero-torn.png"} alt="" className="block h-auto max-h-[640px] w-full object-contain object-right" />
        </div>
      </div>
    </section>
  );
}

/** "Label: value" lines with the value in semibold black (Figma history info cards). */
function LabelledLines({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const at = line.indexOf(": ");
        return (
          <span key={i} className="block">
            {at < 0 ? (
              line
            ) : (
              <>
                {line.slice(0, at + 2)}
                <span className="font-semibold text-black">{line.slice(at + 2)}</span>
              </>
            )}
          </span>
        );
      })}
    </>
  );
}

/**
 * `about-history` (Figma "2. About us" 375:13784 – 375:13791, 375:13718): green eyebrow, 35px heading, the history text
 * in a 540px column with the two info cards below it; the 648px photo + photo/map collage on the right (x=728).
 */
export async function AboutHistorySection({ locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as { eyebrow?: B; heading?: B; body?: B; cards?: { title?: B; body?: B }[]; photos?: string[]; mapUrl?: string; address?: B };
  const photos = d.photos ?? ["/images/figma/pages/home-about-road.png", "/images/figma/about-aerial.png", "/images/figma/about-map.png"];
  const address = pickText(d.address, locale);
  const mapHref = d.mapUrl || (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "");
  return (
    <section className="bg-cream pt-[100px] pb-[66px] max-lg:py-10">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 sm:px-8 lg:grid-cols-[minmax(0,540px)_minmax(0,650px)] lg:justify-between lg:px-[62px] lg:pr-[62px]">
        <div className="min-w-0 lg:pt-0.5">
          <p className="text-[22px] leading-[30px] font-semibold text-[#135130] uppercase">{pickText(d.eyebrow, locale)}</p>
          <h2 className="mt-[41px] max-w-[536px] text-[30px] leading-[50px] font-bold text-black lg:text-[35px]">{pickText(d.heading, locale)}</h2>
          <p className="mt-[41px] text-[15px] leading-[25px] whitespace-pre-line text-[#414141]">{pickText(d.body, locale)}</p>
          <div className="mt-[41px] flex flex-wrap gap-[21px] lg:-ml-0.5 lg:w-[650px] lg:flex-nowrap">
            {(d.cards ?? []).map((c, i) => (
              <div key={i} className="w-full max-w-[315px] rounded-[10px] bg-white px-[19px] pt-5 pb-[47px] text-[15px] leading-[26px] drop-shadow-[0_0_10px_rgba(19,81,48,0.25)] lg:max-w-[314px]">
                <p className="font-medium text-black">{pickText(c.title, locale)}</p>
                <p className="mt-2 break-words text-[#414141]">
                  <LabelledLines text={pickText(c.body, locale)} />
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-[13px] lg:-ml-0.5">
          {/* eslint-disable @next/next/no-img-element -- static design assets */}
          <div className="h-[260px] overflow-hidden rounded-[10px] bg-white lg:h-[309px]">
            <img src={photos[0]} alt="" className="size-full object-cover" loading="lazy" />
          </div>
          <div className="grid gap-4 sm:grid-cols-[315fr_317fr]">
            <div className="relative h-[260px] overflow-hidden rounded-[10px] bg-white lg:h-[309px]">
              <img src={photos[1]} alt="" className="absolute top-[-44.42%] left-0 h-[181.23%] w-full max-w-none" loading="lazy" />
            </div>
            <div className="relative h-[260px] overflow-hidden rounded-[10px] bg-[#f93] lg:h-[309px]">
              <img src={photos[2]} alt="" className="absolute top-[-3.13%] left-[-41.87%] h-[103.13%] w-[193.13%] max-w-none object-cover" loading="lazy" />
              {mapHref && (
                <a href={mapHref} target="_blank" rel="noopener" className="absolute top-[11px] right-[15px] inline-flex h-6 w-[119px] items-center gap-[6px] rounded-full bg-[#d9d9d9] pl-[15px] text-[9.3px] leading-[17px] font-medium text-black">
                  <img src="/images/figma/pages/home-about-maps.png" alt="" width={19} height={19} className="size-[19px]" /> {t("openInMaps")}
                </a>
              )}
              {address && (
                <div className="absolute inset-x-0 bottom-0 h-[81px] rounded-t-[12px] bg-[rgba(252,247,238,0.88)] pt-[18px] pl-7">
                  <div className="flex w-[227px] items-center gap-[13px]">
                    <img src="/images/figma/pages/home-about-pin.png" alt="" width={20} height={28} className="mx-[7px] h-7 w-5 shrink-0" />
                    <p className="text-[9.3px] leading-[16.7px] font-medium text-black">{address}</p>
                  </div>
                </div>
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
  // Published hours often come as one sentence ("… 6:15 pm. Weekends …"); the design shows one line per period.
  const hours = pickText(o.hours, locale).replace(/\.\s+(?=\S)/g, "\n");
  return (
    // Figma 375:13650: 746×534 structure card (four 306×176 cards, 24px / 17px apart) and the 535px office card, 35px apart.
    <section className="bg-cream py-8">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 sm:px-8 xl:grid-cols-[746px_minmax(0,1fr)] xl:gap-[35px] lg:px-[62px]">
        <div className="rounded-[11.5px] bg-white p-7 shadow-[0_0_23px_rgba(0,0,0,0.25)] lg:min-h-[534px] lg:px-[29px] lg:pt-[13px] lg:pb-8">
          <p className="text-[18px] leading-[25px] font-semibold text-[#135130] uppercase">{pickText(d.eyebrow, locale)}</p>
          <h2 className="mt-0.5 text-[34px] leading-[58px] font-bold text-black">{pickText(d.heading, locale)}</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:mt-[22px] lg:grid-cols-[306px_306px] lg:justify-center lg:gap-x-6 lg:gap-y-[17px]">
            {(d.members ?? []).map((m, i) => (
              <li key={i} className="flex min-h-[176px] gap-[10px] rounded-[10px] border border-black/15 bg-white py-[13px] pr-3 pl-[11px]" style={{ borderTop: `3px solid ${m.accent ?? "#ff9933"}` }}>
                <span className="relative block h-[146px] w-[122px] shrink-0 overflow-hidden rounded-[8px] bg-[#f4f1ea]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
                  <img src="/images/figma/about-person.png" alt="" className="absolute top-0 -left-[30px] h-[145px] w-[182px] max-w-none object-cover" loading="lazy" />
                </span>
                <div>
                  <p className="pt-0.5 text-[15.2px] leading-[21px] font-bold text-[#f38c28] uppercase">{pickText(m.role, locale)}</p>
                  <p className="mt-[13px] text-[15.5px] leading-[21px] font-bold text-black">{pickText(m.title, locale)}</p>
                  <p className="mt-2 text-[11.6px] leading-[19.3px] text-[#414141]">{pickText(m.body, locale)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[14px] border border-[#135130] bg-[#135130] p-8 text-white lg:px-[34px] lg:pt-6">
          <p className="text-[15px] font-bold uppercase">{pickText(o.eyebrow, locale)}</p>
          <h2 className="mt-2 text-[38px] leading-[50px] font-bold">{pickText(o.heading, locale)}</h2>
          <dl className="mt-5 divide-y divide-white/40 text-[16.5px]">
            <div className="py-4">
              <dt className="text-[15px] font-bold">{pickText(o.addressLabel, locale)}</dt>
              <dd className="mt-2 font-medium">{pickText(o.address, locale)}</dd>
            </div>
            <div className="py-4">
              <dt className="text-[15px] font-bold">{pickText(o.hoursLabel, locale)}</dt>
              <dd className="mt-2 font-medium whitespace-pre-line">{hours}</dd>
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
  // Placeholder rows carry `body`; the backend roles-cards rows carry a list of `points` (responsibilities).
  const d = data as { eyebrow?: B; heading?: B; items?: { title?: B; body?: B; points?: B[] }[] };
  return (
    <section className="bg-cream py-10">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <p className="text-center text-[20px] leading-[27px] font-semibold text-[#135130] uppercase">{pickText(d.eyebrow, locale)}</p>
        <h2 className="mt-3 text-center text-[35px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        {/* Figma 375:13607: 427×246 cards, 20px apart, rows 17px apart. */}
        <ul className="mt-[50px] grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-y-[17px]">
          {(d.items ?? []).map((it, i) => (
            <li key={i} className="min-h-[246px] rounded-[13.5px] bg-white px-7 py-10 shadow-[0_0_27px_rgba(0,0,0,0.25)]">
              <span className="inline-flex h-[49px] w-[54px] items-center justify-center rounded-full bg-[rgba(243,140,40,0.09)] text-[24px] font-bold text-[#f38c28]">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-[21.6px] leading-[34px] font-bold text-black">{pickText(it.title, locale)}</h3>
              {pickText(it.body, locale) && <p className="mt-5 text-[16.2px] leading-[27px] text-[#414141]">{pickText(it.body, locale)}</p>}
              {(it.points?.length ?? 0) === 1 && <p className="mt-5 text-[16.2px] leading-[27px] text-[#414141]">{pickText(it.points![0], locale)}</p>}
              {(it.points?.length ?? 0) > 1 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-[16.2px] leading-[27px] text-[#414141]">
                  {it.points!.map((pt, k) => (
                    <li key={k}>{pickText(pt, locale)}</li>
                  ))}
                </ul>
              )}
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
  // `icon` (set when the backend emergency-services section is merged in) picks the pictogram; else the design order.
  const d = data as { eyebrow?: B; heading?: B; items?: { label?: B; numbers?: string[]; icon?: string }[] };
  return (
        // Figma 375:13503: 5% green tint over the cream page, 203×199 tiles (18–20px apart, rows 16px apart), 58px pictograms.
    <section className="bg-[#f1f2e7] py-8">
      <div className="mx-auto max-w-[1326px] px-4 sm:px-8">
        <p className="text-center text-[20px] leading-[27px] font-semibold text-[#135130] uppercase">{pickText(d.eyebrow, locale)}</p>
        <h2 className="mt-3 text-center text-[35px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        <ul className="mx-auto mt-11 flex max-w-[1095px] flex-wrap justify-center gap-x-[19px] gap-y-4">
          {(d.items ?? []).map((it, i) => {
            const icon = it.icon && EMERGENCY_ICONS.includes(it.icon) ? it.icon : EMERGENCY_ICONS[i % EMERGENCY_ICONS.length]!;
            return (
              <li key={i} className="flex min-h-[199px] w-[203px] flex-col items-center gap-4 rounded-[10px] border border-black/15 bg-white px-[26px] pt-6 pb-5 shadow-[0_0_10px_rgba(0,0,0,0.25)]">
                <FigmaIcon name={`emerg-${icon}`} width={80} height={69} className="-my-[5px]" />
                <p className="text-center text-[14.8px] leading-4 font-semibold text-black">{pickText(it.label, locale)}</p>
                <div className="flex flex-wrap justify-center gap-4">
                  {(it.numbers ?? []).map((n) => (
                    <a key={n} href={`tel:${n.replace(/[^\d+]/g, "")}`} className="inline-flex h-[27px] items-center rounded-[8px] border-[0.8px] border-[#138808] pr-2 pl-2 text-[12.8px] leading-[17px] font-extrabold whitespace-nowrap text-[#138808] hover:bg-[#138808]/5">
                      <Phone className="size-[19px] -rotate-90 p-[3px]" aria-hidden /> {n}
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
  const d = data as { visionLabel?: B; vision?: B; visionBody?: B; missionLabel?: B; mission?: B; missionPoints?: B[]; valuesLabel?: B; values?: B[] };
  return (
    // Figma: the vision band sits 63px below the emergency tint.
    <section className="bg-cream py-8 lg:pt-[63px]">
      <div className="relative mx-auto max-w-[1324px] overflow-hidden rounded-[10px] bg-[#135130]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
        <img src="/images/figma/about-vision.png" alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
        <div aria-hidden className="absolute inset-0 bg-[rgba(19,81,48,0.9)]" />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_313px_313px] lg:px-[110px] lg:py-[23px]">
          <div className="flex flex-col justify-center gap-6 py-6 lg:pr-10">
            <p className="text-[22px] font-semibold text-[#f3d828] uppercase">{pickText(d.visionLabel, locale)}</p>
            <p className="text-[35px] leading-[50px] font-bold text-white">{pickText(d.vision, locale)}</p>
            <p className="text-[14px] text-white">{pickText(d.visionBody, locale)}</p>
          </div>
          <div className="rounded-[10px] border border-white/20 bg-white/10 p-6">
            <p className="text-[22px] font-semibold text-[#f3d828] uppercase">{pickText(d.missionLabel, locale)}</p>
            {pickText(d.mission, locale) && <p className="mt-6 text-[14px] leading-6 text-white">{pickText(d.mission, locale)}</p>}
            {(d.missionPoints?.length ?? 0) > 0 && (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-[14px] leading-6 text-white">
                {d.missionPoints!.map((v, i) => (
                  <li key={i}>{pickText(v, locale)}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-[10px] border border-white/20 bg-white/10 p-6">
            <p className="text-[22px] font-semibold text-[#f3d828] uppercase">{pickText(d.valuesLabel, locale)}</p>
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
