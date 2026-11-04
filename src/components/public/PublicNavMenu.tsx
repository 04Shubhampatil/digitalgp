"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export interface PublicNavLink {
  href: string;
  label: string;
}
export interface PublicNavGroupView {
  /** null = render the single link directly */
  label: string | null;
  links: PublicNavLink[];
}

/**
 * Desktop: inline links + dropdowns. Only one dropdown is open at a time: it opens on hover or click and closes when
 * the pointer leaves, on an outside click, on Escape and on navigation. Mobile: toggle button + stacked list.
 */
export function PublicNavMenu({ groups, menuLabel }: { groups: PublicNavGroupView[]; menuLabel: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [lastPath, setLastPath] = useState(pathname);
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Navigating closes the dropdown and the mobile menu.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpenGroup(null);
    setOpen(false);
  }

  useEffect(() => {
    if (openGroup === null) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenGroup(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openGroup]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenGroup(null), 150);
  };

  // The website root ("/savardari") is active only on itself; other links also on their sub-pages.
  const isRoot = (href: string) => href.split("/").filter(Boolean).length <= 1;
  const isActive = (href: string) => pathname === href || (!isRoot(href) && pathname.startsWith(`${href}/`));

  return (
    <>
      {/* Figma navbar (375:13489): each item is a 135px slot, 14px semibold #414141, no chevrons. */}
      <nav ref={navRef} aria-label="Primary" className="hidden items-start lg:flex">
        {groups.map((g, i) =>
          g.label === null ? (
            g.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn(
                  "flex w-[135px] justify-center border-b-2 py-2.5 text-center text-[14px] leading-5 font-semibold tracking-[0.1px] hover:border-primary-alt/40",
                  isActive(l.href) ? "border-primary-alt text-primary-alt" : "border-transparent text-[#414141]",
                )}
              >
                {l.label}
              </Link>
            ))
          ) : (
            <div
              key={i}
              className="relative"
              onMouseEnter={() => {
                cancelClose();
                setOpenGroup(i);
              }}
              onMouseLeave={closeSoon}
            >
              <button
                type="button"
                aria-expanded={openGroup === i}
                aria-haspopup="true"
                onClick={() => setOpenGroup((o) => (o === i ? null : i))}
                className={cn(
                  "flex w-[135px] cursor-pointer justify-center border-b-2 py-2.5 text-center text-[14px] leading-5 font-semibold tracking-[0.1px] hover:border-primary-alt/40",
                  g.links.some((l) => isActive(l.href)) ? "border-primary-alt text-primary-alt" : "border-transparent text-[#414141]",
                )}
              >
                {g.label}
              </button>
              {openGroup === i && (
                <ul className="absolute left-0 z-20 mt-1 min-w-52 rounded-card border border-line bg-surface p-1 shadow-lg">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpenGroup(null)}
                        aria-current={isActive(l.href) ? "page" : undefined}
                        className={cn("block rounded px-3 py-2 text-sm hover:bg-surface-soft", isActive(l.href) ? "font-semibold text-primary" : "text-ink")}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ),
        )}
      </nav>

      <button
        type="button"
        className="rounded p-2 text-ink hover:bg-surface-soft lg:hidden"
        aria-expanded={open}
        aria-controls="public-mobile-nav"
        aria-label={menuLabel}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
      </button>

      {open && (
        <nav id="public-mobile-nav" aria-label="Primary" className="absolute inset-x-0 top-full border-b border-line bg-surface p-4 shadow-lg lg:hidden">
          {groups.map((g, i) => (
            <div key={i} className="mb-3">
              {g.label && <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{g.label}</p>}
              <ul>
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={cn("block rounded px-2 py-2 text-sm", isActive(l.href) ? "font-semibold text-primary" : "text-ink")}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </>
  );
}
