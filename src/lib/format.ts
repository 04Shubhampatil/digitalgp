import type { UiLocale } from "@/i18n/config";

const INTL_LOCALE: Record<UiLocale, string> = { mr: "mr-IN", en: "en-IN" };

export function formatDate(iso: string | null | undefined, locale: UiLocale, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], opts ?? { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(iso: string | null | undefined, locale: UiLocale): string {
  return formatDate(iso, locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** ISO string → value for <input type="datetime-local"> (local time, minutes precision). */
export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value → ISO string (UTC) or null when empty. */
export function fromDateTimeLocal(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
