import { pickText, type Bilingual } from "@/i18n/text";
import { publicMediaUrl } from "@/lib/api/public";
import type { SectionProps } from "./index";

interface WelcomeData {
  heading?: Bilingual;
  body?: Bilingual;
  imageId?: string;
}

/** "About the village" / welcome block: heading + long text, optional image on the right. */
export function WelcomeSection({ slug, locale, data }: SectionProps) {
  const d = data as WelcomeData;
  const heading = pickText(d.heading, locale);
  const body = pickText(d.body, locale);
  const image = d.imageId ? publicMediaUrl(slug, d.imageId) : null;
  if (!heading && !body) return null;

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-2 md:items-center">
      <div>
        {heading && <h2 className="text-2xl font-bold text-ink md:text-3xl">{heading}</h2>}
        {body && <p className="mt-4 text-base leading-relaxed whitespace-pre-line text-muted">{body}</p>}
      </div>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element -- backend-served media
        <img src={image} alt="" className="aspect-[4/3] w-full rounded-card object-cover shadow-sm" loading="lazy" />
      )}
    </section>
  );
}
