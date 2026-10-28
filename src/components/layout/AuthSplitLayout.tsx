import { getTranslations } from "next-intl/server";
import { Emblem } from "@/components/ui/Emblem";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

/** Figma "Admin log in": dark-green brand panel (610px) + light form side. */
export async function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  return (
    <div className="flex min-h-dvh bg-canvas-alt">
      <aside className="relative hidden w-[42%] max-w-[610px] flex-col justify-center bg-primary px-12 text-white lg:flex">
        <div className="flex items-center gap-5">
          <Emblem size={206} />
          <div>
            <p className="font-inter text-[26px] leading-tight font-bold">{t("common.systemName")}</p>
            <p className="mt-2 font-inter text-[19px] leading-snug text-[#b8dbc7]">{t("common.department")}</p>
          </div>
        </div>
        <p className="absolute bottom-10 left-12 text-xs text-[#a6cfb8]">{t("auth.govtInitiative")}</p>
      </aside>

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="absolute top-6 right-6">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-[520px] rounded-2xl border border-line bg-surface p-8 shadow-sm sm:p-12">{children}</div>
        <span className="mt-8 inline-flex items-center gap-2 rounded-full bg-success-soft px-4 py-1.5 text-xs font-semibold text-primary">
          <span aria-hidden className="size-2 rounded-full bg-accent" />
          {t("auth.secureAccess")}
        </span>
      </main>
    </div>
  );
}
