import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { GrievanceSubmitForm, GrievanceTrackForm } from "@/components/public/GrievanceForms";
import { pickText, type Bilingual } from "@/i18n/text";
import type { SectionProps } from "./index";

type B = Bilingual | undefined;

/** `callout`: white rounded card with an icon that overlaps the bottom of the hero (Figma "Data" frame). */
export function CalloutSection({ locale, data }: SectionProps) {
  const d = data as { text?: B; highlight?: B };
  const text = pickText(d.text, locale);
  const hl = pickText(d.highlight, locale);
  const [before, after] = hl && text.includes(hl) ? text.split(hl) : [text, ""];
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-[1097px] px-4 sm:px-8 lg:-mt-[69px]">
      <div className="flex items-center gap-5 rounded-[20px] bg-white px-6 py-6 shadow-[0_2px_16px_rgba(0,0,0,0.18)]">
        <span aria-hidden className="flex size-[70px] shrink-0 items-center justify-center rounded-full bg-[#e3f1d4] text-[#5a9a1f]">
          <Users className="size-8" />
        </span>
        <p className="text-[18px] leading-8 text-black">
          {before}
          {hl && <strong className="font-bold text-[#135130]">{hl}</strong>}
          {after}
        </p>
      </div>
    </section>
  );
}

/** `grievance-register`: centred heading + the real complaint form (POST /public/:slug/grievances). */
export async function GrievanceRegisterSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.grievanceForm");
  const d = data as { heading?: B };
  return (
    <section id="register" className="bg-cream py-8">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-8">
        <h2 className="mb-6 text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale) || t("registerTitle")}</h2>
        <div className="rounded-[10px] border border-black/20 bg-white p-6 sm:p-8">
          <GrievanceSubmitForm slug={slug} />
        </div>
      </div>
    </section>
  );
}

/** `grievance-track`: centred heading + the real status lookup (POST /public/:slug/grievances/track). */
export async function GrievanceTrackSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.grievanceForm");
  const d = data as { heading?: B; howTitle?: B; howSteps?: unknown };
  const steps = Array.isArray(d.howSteps) ? (d.howSteps as B[]) : [];
  return (
    <section id="track" className="bg-cream py-8">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-8">
        <h2 className="mb-6 text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale) || t("trackTitle")}</h2>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_459px]">
          <div className="rounded-[10px] border border-black/20 bg-white p-6 sm:p-8">
            <GrievanceTrackForm slug={slug} />
          </div>
          {steps.length > 0 && (
            <div className="rounded-[10px] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.08)]">
              {pickText(d.howTitle, locale) && <h3 className="text-[20px] font-semibold text-[#135130]">{pickText(d.howTitle, locale)}</h3>}
              <ol className="mt-4 space-y-3">
                {steps.map((s, i) => (
                  <li key={i} className="flex items-center gap-3 text-[15px] text-black">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#135130] text-[12px] font-semibold text-white">{i + 1}</span>
                    {pickText(s, locale)}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
