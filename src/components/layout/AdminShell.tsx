import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { CurrentUserDto } from "@/types/api";
import { Emblem } from "@/components/ui/Emblem";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { hasCapability, primaryRole } from "@/lib/session";
import { AdminNav, type NavGroup } from "./AdminNav";
import { LogoutButton } from "./LogoutButton";

/**
 * Admin frame from Figma (Admin / Block / GP CMS navbars collapsed into one data-driven sidebar):
 * 263px dark-green sidebar + top bar. Items are filtered by the capabilities the backend returned —
 * a UI hint only; every API call is re-checked server-side.
 */
export async function AdminShell({ user, children }: { user: CurrentUserDto; children: React.ReactNode }) {
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  const role = primaryRole(user);

  const groups: NavGroup[] = [
    { items: [{ href: "/admin/dashboard", label: t("dashboard") }] },
    {
      label: t("management"),
      items: [
        { href: "/admin/hierarchy", label: t("hierarchy"), show: hasCapability(user, "hierarchy:read") },
        { href: "/admin/websites", label: t("websites"), show: hasCapability(user, "tenant:read") },
        { href: "/admin/users", label: t("users"), show: hasCapability(user, "user:read") },
      ],
    },
    {
      label: t("contentManagement"),
      items: [
        { href: "/admin/announcements", label: t("announcements"), show: hasCapability(user, "content:read") },
        { href: "/admin/schemes", label: t("schemes"), show: hasCapability(user, "content:read") },
        { href: "/admin/projects", label: t("projects"), show: hasCapability(user, "content:read") },
        { href: "/admin/media", label: t("media"), show: hasCapability(user, "media:manage") },
        { href: "/admin/grievances", label: t("grievances"), show: hasCapability(user, "grievance:manage") },
      ],
    },
    {
      label: t("administration"),
      items: [
        { href: "/admin/roles", label: t("roles"), show: hasCapability(user, "roles:manage") },
        {
          href: "/admin/audit-logs",
          label: t("auditLogs"),
          show: hasCapability(user, "audit:read") || hasCapability(user, "audit:read-own"),
        },
        { href: "/admin/profile", label: t("profile") },
      ],
    },
  ];

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 flex h-dvh w-[263px] shrink-0 flex-col bg-primary-deep text-cream">
        <div className="flex items-center gap-3 border-b border-primary-edge px-4 py-4">
          <Emblem size={44} />
          <div>
            <p className="font-brand text-sm font-bold leading-[17.5px]">{tc("appName")}</p>
            <p className="font-brand-sub text-[10px] leading-4 tracking-[0.8px] uppercase">{tc("appTagline")}</p>
          </div>
        </div>

        <AdminNav groups={groups} />

        <div className="mt-auto flex items-center gap-3 border-t border-primary-edge px-4 py-3">
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-[4px] bg-cream/15 font-brand-sub text-xs font-semibold"
          >
            {user.user.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-brand-sub text-xs font-semibold">{user.user.name}</p>
            <p className="truncate font-brand-sub text-[10px] text-accent">{role ? t(`role.${role}`) : "—"}</p>
          </div>
          <LogoutButton label={tc("logout")} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] items-center justify-between gap-4 border-b border-line bg-canvas px-5">
          <div className="flex items-center gap-3 text-sm text-muted">
            {/* Scope selectors (District / Taluka / GP) land with the hierarchy screen. */}
            <Link href="/admin/dashboard" className="font-semibold text-ink">
              {t("dashboard")}
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="text-right">
              <p className="text-xs font-semibold text-ink">{user.user.name}</p>
              <p className="font-brand-sub text-[10px] text-primary-alt">{role ? t(`role.${role}`) : ""}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
