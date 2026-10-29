import { Clock, ExternalLink, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { TenantDto } from "@/types/api";
import { Card, CardHeader } from "@/components/ui/Card";

/**
 * "Contact Information" card of the Contact & Collaboration editor (Figma): the contact details the
 * public Contact page and footer already read from the website settings (address, phone, email,
 * hours, social links), with a link to edit them. The details are saved with the website settings so
 * the footer, header and Contact page always agree.
 */
export async function ContactManager({ tenant, canUpdate }: { tenant: TenantDto; canUpdate: boolean }) {
  const [t, ts] = await Promise.all([getTranslations("admin"), getTranslations("admin.settingsUi")]);
  const c = tenant.settings.contact ?? {};
  const s = tenant.settings.social ?? {};
  const rows = [
    { icon: MapPin, label: ts("address"), value: c.address },
    { icon: Phone, label: ts("phone"), value: c.phone },
    { icon: Mail, label: ts("email"), value: c.email },
    { icon: Clock, label: ts("hours"), value: c.hours },
  ];
  const social = [
    ["Facebook", s.facebook],
    ["Instagram", s.instagram],
    ["YouTube", s.youtube],
  ] as const;

  return (
    <Card>
      <CardHeader
        title={t("websites.contactCardTitle")}
        description={t("websites.contactCardDesc")}
        actions={
          canUpdate ? (
            <Link href={`/admin/websites/${tenant.id}#settings`} className="inline-flex h-10 items-center gap-2 rounded-button bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">
              <Pencil className="size-4" aria-hidden /> {t("websites.editContact")}
            </Link>
          ) : null
        }
      />
      <dl className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex gap-3 rounded-input border border-line p-4">
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0">
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</dt>
              <dd className="mt-1 text-sm break-words text-ink">{value || <span className="text-muted">—</span>}</dd>
            </div>
          </div>
        ))}
        <div className="rounded-input border border-line p-4 sm:col-span-2">
          <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{ts("social")}</dt>
          <dd className="mt-2 flex flex-wrap gap-4 text-sm">
            {social.some(([, url]) => url) ? (
              social.map(([name, url]) =>
                url ? (
                  <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                    {name} <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                ) : null,
              )
            ) : (
              <span className="text-muted">—</span>
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
