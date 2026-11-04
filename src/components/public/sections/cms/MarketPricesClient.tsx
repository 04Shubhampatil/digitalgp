"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

export interface MarketView {
  key: string;
  name: string;
  /** "Last Updated: …" line, already formatted (may be empty). */
  updated: string;
  stale: boolean;
  rows: { commodity: string; unit: string; min: string; max: string; modal: string }[];
}

/**
 * Market switcher + price table of the `market-prices` card. With one market the name is shown as a
 * label; with several the Figma "Select Market" dropdown switches the rows. `footer` is the card's
 * right-aligned link (rendered by the server section).
 */
export function MarketPricesClient({
  markets,
  initialKey,
  labels,
  note,
  footer,
}: {
  markets: MarketView[];
  initialKey: string;
  labels: { market: string; select: string; commodity: string; unit: string; min: string; max: string; modal: string; stale: string };
  note?: string;
  footer?: ReactNode;
}) {
  const [key, setKey] = useState(initialKey);
  const id = useId();
  const m = markets.find((x) => x.key === key) ?? markets[0]!;
  return (
    <>
      {markets.length > 1 ? (
        <div className="mt-3 flex items-center gap-3 text-[13px] font-semibold text-[#135130]">
          <label htmlFor={id}>{labels.market}</label>
          <span className="relative">
            <select
              id={id}
              value={m.key}
              onChange={(e) => setKey(e.target.value)}
              aria-label={labels.select}
              className="h-8 appearance-none rounded-[6px] border border-black/15 bg-white pr-8 pl-3 text-[13px] font-normal text-black focus:border-[#135130] focus:outline-none"
            >
              {markets.map((x) => (
                <option key={x.key} value={x.key}>
                  {x.name}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-[#414141]" />
          </span>
        </div>
      ) : (
        m.name && (
          <p className="mt-3 flex items-center gap-3 text-[13px] font-semibold text-[#135130]">
            {labels.market}
            <span className="rounded-[6px] border border-black/15 px-3 py-1 font-normal text-black">{m.name}</span>
          </p>
        )
      )}
      <div className="mt-3 overflow-x-auto rounded-[8px] border border-black/10">
        <table className="w-full min-w-[26rem] text-left text-[12px]">
          <thead className="text-[12px] text-black">
            <tr className="border-b border-black/10">
              <th className="px-3 py-2 font-semibold">{labels.commodity}</th>
              <th className="px-3 py-2 font-semibold">{labels.unit}</th>
              <th className="px-3 py-2 text-right font-semibold">{labels.min}</th>
              <th className="px-3 py-2 text-right font-semibold">{labels.max}</th>
              <th className="px-3 py-2 text-right font-semibold">{labels.modal}</th>
            </tr>
          </thead>
          <tbody>
            {m.rows.map((r, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5 text-black">{r.commodity}</td>
                <td className="px-3 py-1.5 text-[#414141]">{r.unit}</td>
                <td className="px-3 py-1.5 text-right">{r.min}</td>
                <td className="px-3 py-1.5 text-right">{r.max}</td>
                <td className="px-3 py-1.5 text-right">{r.modal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="mt-2 text-[12px] text-[#414141]">{note}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
        <p className={`text-[12px] ${m.stale ? "font-medium text-[#c25f00]" : "text-[#414141]"}`}>
          {m.updated}
          {m.stale && `${m.updated ? " · " : ""}${labels.stale}`}
        </p>
        {footer}
      </div>
    </>
  );
}
