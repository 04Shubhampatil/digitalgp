import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Calendar,
  CircleDot,
  Cloud,
  Download,
  Droplets,
  FileText,
  Globe,
  GraduationCap,
  Hammer,
  Heart,
  House,
  IndianRupee,
  Info,
  Landmark,
  Leaf,
  Lightbulb,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Recycle,
  School,
  ShieldCheck,
  Sprout,
  Star,
  Stethoscope,
  Sun,
  Trash2,
  TreePine,
  Trophy,
  Users,
  Wheat,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { createElement, type ReactNode } from "react";
import { pickText, type Bilingual } from "@/i18n/text";
import { publicMediaUrl } from "@/lib/api/public";
import type { UiLocale } from "@/i18n/config";

export type B = Bilingual | undefined;

/** Icon names are free text in the backend (`icon: text(40)`); this maps the common ones to lucide icons. */
const ICONS: Record<string, LucideIcon> = {
  users: Users,
  people: Users,
  population: Users,
  house: House,
  home: House,
  household: House,
  sprout: Sprout,
  plant: Sprout,
  agriculture: Wheat,
  wheat: Wheat,
  leaf: Leaf,
  tree: TreePine,
  trees: TreePine,
  book: BookOpen,
  bookopen: BookOpen,
  education: GraduationCap,
  graduationcap: GraduationCap,
  school: School,
  water: Droplets,
  droplet: Droplets,
  droplets: Droplets,
  electricity: Zap,
  zap: Zap,
  power: Zap,
  sanitation: Trash2,
  trash: Trash2,
  waste: Recycle,
  recycle: Recycle,
  light: Lightbulb,
  lightbulb: Lightbulb,
  streetlight: Lightbulb,
  road: Hammer,
  hammer: Hammer,
  repair: Wrench,
  wrench: Wrench,
  transport: Bus,
  bus: Bus,
  health: Stethoscope,
  stethoscope: Stethoscope,
  heart: Heart,
  building: Building2,
  building2: Building2,
  landmark: Landmark,
  office: Building2,
  briefcase: Briefcase,
  job: Briefcase,
  jobs: Briefcase,
  rupee: IndianRupee,
  money: IndianRupee,
  indianrupee: IndianRupee,
  calendar: Calendar,
  date: Calendar,
  file: FileText,
  filetext: FileText,
  document: FileText,
  download: Download,
  phone: Phone,
  call: Phone,
  mail: Mail,
  email: Mail,
  map: MapPin,
  mappin: MapPin,
  location: MapPin,
  globe: Globe,
  web: Globe,
  website: Globe,
  megaphone: Megaphone,
  announcement: Megaphone,
  info: Info,
  shield: ShieldCheck,
  shieldcheck: ShieldCheck,
  star: Star,
  award: Award,
  trophy: Trophy,
  sun: Sun,
  cloud: Cloud,
};

/** Resolve a free-text icon name (`"Users"`, `"street-light"`, …) to an icon; unknown names get a neutral dot. */
export function iconByName(name: string | undefined): LucideIcon {
  const key = (name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return ICONS[key] ?? CircleDot;
}

export function Icon({ name, className }: { name?: string; className?: string }) {
  // The icon comes from a lookup table, so it is created with createElement (not a component defined in render).
  return createElement(iconByName(name), { className: className ?? "size-6", "aria-hidden": true });
}

/** URL of a website media id, or undefined. */
export function mediaUrl(slug: string, id: string | undefined): string | undefined {
  return id ? publicMediaUrl(slug, id) : undefined;
}

/** `#RRGGBB` + opacity (0-100) → `rgba(...)`. */
export function withOpacity(hex: string, percent: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(0,0,0,${percent / 100})`;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(100, percent)) / 100})`;
}

/** https link that opens safely in a new tab. */
export const externalProps = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Standard page section: optional heading block on a white or cream band. */
export function Band({
  heading,
  subheading,
  tone = "white",
  action,
  children,
  id,
}: {
  heading?: string;
  subheading?: string;
  tone?: "white" | "cream";
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={tone === "cream" ? "bg-cream py-10" : "bg-white py-10"}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        {(heading || subheading || action) && (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-3xl">
              {heading && <h2 className="text-[26px] leading-tight font-semibold text-black">{heading}</h2>}
              {subheading && <p className="mt-1 text-[14px] leading-6 text-[#414141]">{subheading}</p>}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export const cardClass = "rounded-[10px] border border-black/10 bg-white p-5 shadow-[0_0_10px_rgba(0,0,0,0.07)]";

export function LinkButton({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? externalProps : {})}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#135130] px-4 py-2 text-[12.5px] font-medium text-[#135130] hover:bg-[#135130] hover:text-white"
    >
      {children}
    </a>
  );
}

/** A localized string from bilingual data. */
export const tx = (b: B, locale: UiLocale): string => pickText(b, locale);

/** Items of a list field, tolerant of missing data. */
export function list<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Embed URL for a YouTube / Vimeo link, or null when the link is not one of them. */
export function videoEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") ?? (u.pathname.startsWith("/embed/") || u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : null);
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

/** Sandboxed video player for a YouTube / Vimeo link (null if the link is not embeddable). */
export function VideoEmbed({ url, title }: { url: string | undefined; title: string }) {
  const src = videoEmbedUrl(url);
  if (!src) return null;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-[10px] bg-black">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow="fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        className="size-full border-0"
      />
    </div>
  );
}
