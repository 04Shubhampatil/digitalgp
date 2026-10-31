"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export interface SearchEntry {
  href: string;
  label: string;
}

/** Top-bar search: jump to any admin page the user can open (filters the sidebar entries). */
export function AdminSearch({ entries, placeholder }: { entries: SearchEntry[]; placeholder: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? entries.filter((e) => e.label.toLowerCase().includes(needle)).slice(0, 8) : [];
  }, [q, entries]);
  return (
    <div className="relative hidden w-[190px] lg:block">
      <label className="relative block">
        <span className="sr-only">{placeholder}</span>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="h-9 w-full rounded-[4px] border border-line-strong bg-surface pr-9 pl-3 text-xs text-ink outline-none placeholder:text-placeholder focus:border-primary"
        />
        <Search aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted" />
      </label>
      {open && hits.length > 0 && (
        <ul className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-[4px] border border-line bg-surface shadow-lg">
          {hits.map((h) => (
            <li key={h.href}>
              <Link href={h.href} onClick={() => setQ("")} className="block px-3 py-2 text-xs text-ink hover:bg-surface-soft">
                {h.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
