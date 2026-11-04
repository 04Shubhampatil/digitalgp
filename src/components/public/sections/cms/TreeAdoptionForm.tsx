"use client";

import { Bell, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Turnstile } from "@/components/public/Turnstile";
import { isApiError } from "@/lib/api/client";
import { submitTreeAdoption } from "@/lib/api/public";

/** Anchor of the "Adopt a Tree Now" button: "page:environment#adopt-a-tree" opens the form directly. */
export const TREE_ADOPTION_ANCHOR = "adopt-a-tree";

const INPUT = "h-[48px] w-full rounded-[10px] border border-black/30 bg-white px-4 text-[15px] font-normal text-black placeholder:text-[#8a8a8a] focus:border-[#135130] focus:outline-none";
const LABEL = "flex flex-col gap-1.5 text-[15px] font-semibold text-black";

/**
 * "Adopt a Tree Now" button of the Environment `tree-adoption` card. Opens a dialog with the adoption
 * request form (POST /public/:slug/tree-adoptions: same honeypot / Turnstile handling as the contact
 * forms). The endpoint is open only while the section is published with `enabled: true`; when it answers
 * 404 / 403 the dialog says so and links to the volunteer form (`fallbackHref`) instead.
 */
export function TreeAdoptionButton({ slug, label, successMessage, fallbackHref }: { slug: string; label: string; successMessage?: string; fallbackHref: string }) {
  const t = useTranslations("public.cms");
  const tc = useTranslations("common");
  const dialog = useRef<HTMLDialogElement>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  function open() {
    dialog.current?.showModal();
  }

  // "…/environment#adopt-a-tree" (e.g. the hero button) opens the form straight away.
  useEffect(() => {
    const check = () => {
      if (window.location.hash === `#${TREE_ADOPTION_ANCHOR}` && !dialog.current?.open) dialog.current?.showModal();
    };
    check();
    // Same-page links (the hero button) only change the hash.
    window.addEventListener("hashchange", check);
    // Client-side links (next/link) change the hash with pushState, which fires no hashchange.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement)) return;
      const url = new URL(a.href, window.location.href);
      if (url.pathname === window.location.pathname && url.hash === `#${TREE_ADOPTION_ANCHOR}` && !dialog.current?.open) {
        e.preventDefault();
        dialog.current?.showModal();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("hashchange", check);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const s = (k: string) => String(fd.get(k) ?? "").trim();
    const opt = (k: string) => s(k) || null;
    setError(null);
    setBusy(true);
    try {
      const r = await submitTreeAdoption(slug, {
        name: s("name"),
        phone: s("phone"),
        email: opt("email"),
        address: opt("address"),
        treeCount: Number(s("treeCount") || "1"),
        species: opt("species"),
        preferredLocation: opt("preferredLocation"),
        message: opt("message"),
        website: s("website"),
        turnstileToken: token ?? undefined,
      });
      setDone(successMessage || r.message || t("treeThanks"));
      form.reset();
    } catch (err) {
      if (isApiError(err, "NOT_FOUND") || isApiError(err, "FORBIDDEN")) setClosed(true);
      else if (isApiError(err, "VALIDATION_ERROR")) setError(err.issues.map((i) => `${i.path}: ${i.message}`).join(" ") || err.message);
      else if (isApiError(err, "RATE_LIMITED")) setError(t("formRateLimited"));
      else setError(err instanceof Error ? err.message : tc("errorGeneric"));
      // Turnstile tokens work once: get a fresh one for the next try.
      setToken(null);
      setResetKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        id={TREE_ADOPTION_ANCHOR}
        type="button"
        onClick={open}
        className="mt-5 inline-flex h-[44px] scroll-mt-[180px] items-center gap-3 rounded-[8px] bg-[#135130] px-6 text-[15px] font-semibold text-white hover:opacity-90"
      >
        {label}
        <Bell aria-hidden className="size-5" fill="currentColor" />
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="tree-adoption-title"
        className="m-auto w-[min(760px,calc(100vw-32px))] rounded-[14px] bg-white p-0 shadow-[0_8px_40px_rgba(0,0,0,0.25)] backdrop:bg-black/40"
      >
        <div className="max-h-[calc(100dvh-48px)] overflow-y-auto px-6 pt-5 pb-7">
          <div className="flex items-start justify-between gap-4">
            <h2 id="tree-adoption-title" className="text-[24px] leading-9 font-semibold text-[#135130]">
              {t("treeFormTitle")}
            </h2>
            <button type="button" onClick={() => dialog.current?.close()} aria-label={t("treeClose")} className="rounded-full p-1.5 text-[#414141] hover:bg-black/5">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          {done ? (
            <p role="status" className="mt-4 rounded-[8px] bg-[#e8f1ea] px-4 py-4 text-center text-[15px] font-medium text-[#135130]">
              {done}
            </p>
          ) : closed ? (
            <div role="alert" className="mt-4 rounded-[8px] bg-[#fef4e8] px-4 py-4 text-[15px] text-black">
              <p>{t("treeClosed")}</p>
              <a href={fallbackHref} onClick={() => dialog.current?.close()} className="mt-3 inline-flex h-[40px] items-center rounded-full bg-[#135130] px-5 text-[14px] font-semibold text-white hover:opacity-90">
                {t("treeUseVolunteer")}
              </a>
            </div>
          ) : (
            <form method="post" onSubmit={onSubmit} className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <label className={LABEL}>
                {t("fullName")}
                <input name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder={t("phName")} className={INPUT} />
              </label>
              <label className={LABEL}>
                {t("fbPhone")}
                <input name="phone" type="tel" required autoComplete="tel" pattern="\+?[0-9]{10,15}" placeholder={t("phPhone")} className={INPUT} />
              </label>
              <label className={LABEL}>
                {t("fbEmail")}
                <input name="email" type="email" autoComplete="email" placeholder={t("phEmail")} className={INPUT} />
              </label>
              <label className={LABEL}>
                {t("treeCount")}
                <input name="treeCount" type="number" required min={1} max={100} defaultValue={1} className={INPUT} />
              </label>
              <label className={`${LABEL} sm:col-span-2`}>
                {t("volAddress")}
                <input name="address" maxLength={500} autoComplete="street-address" placeholder={t("phAddress")} className={INPUT} />
              </label>
              <label className={LABEL}>
                {t("treeSpecies")}
                <input name="species" maxLength={120} placeholder={t("phTreeSpecies")} className={INPUT} />
              </label>
              <label className={LABEL}>
                {t("treeLocation")}
                <input name="preferredLocation" maxLength={200} placeholder={t("phTreeLocation")} className={INPUT} />
              </label>
              <label className={`${LABEL} sm:col-span-2`}>
                {t("treeMessage")}
                <textarea name="message" rows={3} maxLength={2000} placeholder={t("phTreeMessage")} className={`${INPUT} h-auto py-3`} />
              </label>
              <Turnstile onToken={setToken} resetKey={resetKey} />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
              <div className="flex flex-col gap-2 sm:col-span-2">
                {error && (
                  <p role="alert" className="rounded-[8px] bg-red-50 px-4 py-3 text-[13px] text-red-700">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={busy} className="h-[46px] w-full rounded-full bg-[#135130] px-6 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-60">
                  {busy ? "…" : t("treeSubmit")}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
