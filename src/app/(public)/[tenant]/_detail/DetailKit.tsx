import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { UiLocale } from "@/i18n/config";
import { isApiError } from "@/lib/api/client";

/**
 * Shared chrome for the public record pages (project, scheme, announcement, success story). Same visual
 * language as the Figma inner pages: cream hero band with an orange eyebrow and a green accent, white
 * cards with a soft shadow, green pills.
 */

/** Load a published record; unknown, unpublished or malformed ids become the 404 page. */
export async function loadOr404<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (err) {
    if (isApiError(err, "NOT_FOUND") || isApiError(err, "VALIDATION_ERROR")) notFound();
    throw err;
  }
}

export const nf = (locale: UiLocale) => (locale === "mr" ? "mr-IN" : "en-IN");

/** Dates and times in the Gram Panchayat's time zone. */
export function fmtDate(locale: UiLocale, iso: string | null | undefined, withTime = false): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(nf(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function fmtMoney(locale: UiLocale, amount: string | null | undefined): string {
  if (!amount) return "";
  const n = Number(amount);
  return Number.isFinite(n) ? new Intl.NumberFormat(nf(locale), { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n) : "";
}

/** "125 KB", "1.2 MB". */
export function fmtBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DetailHero({
  eyebrow,
  title,
  back,
  chips,
  imageUrl,
  children,
}: {
  eyebrow: string;
  title: string;
  back: { href: string; label: string };
  chips?: React.ReactNode;
  imageUrl?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden bg-cream">
      <div className={`mx-auto grid max-w-[1440px] items-center gap-8 px-4 py-10 sm:px-8 lg:px-[62px] ${imageUrl ? "lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]" : ""}`}>
        <div className="flex flex-col gap-5">
          <Link href={back.href} className="inline-flex w-fit items-center gap-2 rounded-full border-[0.6px] border-[#135130] px-4 py-1.5 text-[13px] text-[#135130] hover:bg-[#135130]/5">
            <ArrowLeft className="size-4" aria-hidden /> {back.label}
          </Link>
          <p className="text-[18px] font-semibold tracking-wide text-[#ea7f14] uppercase lg:text-[20px]">{eyebrow}</p>
          <h1 className="max-w-[760px] text-[30px] leading-[40px] font-bold text-black lg:text-[38px] lg:leading-[50px]">{title}</h1>
          {chips && <div className="flex flex-wrap items-center gap-2">{chips}</div>}
          {children}
        </div>
        {imageUrl && (
          <div className="relative h-[260px] overflow-hidden rounded-[14px] bg-[#e8e4d9] shadow-[0_0_20px_rgba(0,0,0,0.12)] sm:h-[340px] lg:h-[380px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
            <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}

export function Chip({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "orange" | "blue" | "red" | "grey" }) {
  const cls = {
    green: "bg-[#dcefdc] text-[#135130]",
    orange: "bg-[#fff0dc] text-[#c25f00]",
    blue: "bg-[#dce9ff] text-[#1a62e0]",
    red: "bg-[#fde3e4] text-[#b42318]",
    grey: "bg-[#ececec] text-[#414141]",
  }[tone];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium ${cls}`}>{children}</span>;
}

/** Page body: main column + optional side column on large screens. */
export function DetailBody({ main, side }: { main: React.ReactNode; side?: React.ReactNode }) {
  return (
    <section className="bg-cream pb-14">
      <div className={`mx-auto grid max-w-[1440px] items-start gap-6 px-4 sm:px-8 lg:px-[62px] ${side ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
        <div className="flex min-w-0 flex-col gap-6">{main}</div>
        {side && <aside className="flex min-w-0 flex-col gap-6">{side}</aside>}
      </div>
    </section>
  );
}

export function DetailCard({ title, children, tone = "white" }: { title?: string; children: React.ReactNode; tone?: "white" | "green" }) {
  return (
    <div className={tone === "green" ? "rounded-[14px] bg-[#135130] p-6 text-white lg:p-8" : "rounded-[10px] border border-black/15 bg-white p-6 shadow-[0_0_10px_rgba(0,0,0,0.06)] lg:p-8"}>
      {title && <h2 className={`mb-4 text-[20px] font-semibold ${tone === "green" ? "text-white" : "text-black"}`}>{title}</h2>}
      {children}
    </div>
  );
}

/** Multi-paragraph text as typed by the office (blank lines separate paragraphs). */
export function Prose({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-4 text-[15px] leading-[26px] text-[#414141]">
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
    </div>
  );
}

/** Label / value rows; rows without a value are left out. */
export function Facts({ rows, tone = "white", stacked }: { rows: { label: string; value: React.ReactNode }[]; tone?: "white" | "green"; /** Label above the value (long values such as date ranges). */ stacked?: boolean }) {
  const shown = rows.filter((r) => r.value !== "" && r.value !== null && r.value !== undefined);
  if (shown.length === 0) return null;
  return (
    <dl className={`divide-y ${tone === "green" ? "divide-white/30" : "divide-black/10"}`}>
      {shown.map((r, i) => (
        <div key={i} className={stacked ? "flex flex-col gap-1 py-3 first:pt-0 last:pb-0" : "flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"}>
          <dt className={`text-[14px] ${tone === "green" ? "text-white/85" : "text-[#414141]"}`}>{r.label}</dt>
          <dd className={`${stacked ? "" : "text-right"} text-[15px] font-semibold ${tone === "green" ? "text-white" : "text-black"}`}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export const pillPrimary = "inline-flex items-center justify-center gap-2 rounded-full border border-[#135130] bg-[#135130] px-5 py-2.5 text-[14px] font-medium text-white hover:opacity-90";
export const pillGhost = "inline-flex items-center justify-center gap-2 rounded-full border-[0.6px] border-[#135130] px-5 py-2.5 text-[14px] text-[#135130] hover:bg-[#135130]/5";
