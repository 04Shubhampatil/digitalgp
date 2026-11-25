import type { WardRow, WardView } from "./WardDetailsCard";

const DEVANAGARI = "०१२३४५६७८९";
const num = (n: number, locale: string) => (locale === "mr" ? String(n).replace(/\d/g, (d) => DEVANAGARI[Number(d)]!) : String(n));
const clampPct = (n: number) => Math.max(5, Math.min(100, Math.round(n)));
const parse = (s: string) => Number(s.replace(/,/g, ""));
const decimals = (s: string) => (s.split(".")[1] ?? "").length;
const fmt = (n: number, like: string) => {
  const d = decimals(like);
  const body = n.toFixed(d);
  return like.includes(",") ? Number(body).toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d }) : body;
};

/** Another figure for a ward row: "a / b" rows keep b and move a (so the bar and the text agree); "82%" and plain numbers move too. */
function sampleRow(r: WardRow, factor: number, delta: number): WardRow {
  const two = r.valueText.match(/^(.*?)(\d[\d,]*(?:\.\d+)?)(\D+?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (two && parse(two[4]!) > 0) {
    const [, pre, a, mid, b, post] = two as unknown as string[];
    const base = typeof r.percent === "number" ? r.percent : (parse(a!) / parse(b!)) * 100;
    const pct = clampPct(base + delta);
    return { ...r, valueText: `${pre}${fmt((parse(b!) * pct) / 100, a!)}${mid}${b}${post}`, percent: pct };
  }
  const one = r.valueText.match(/^(.*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!one) return r;
  const [, pre, n, post] = one as unknown as string[];
  if (/^\s*%/.test(post!)) {
    const pct = clampPct(parse(n!) + delta);
    return { ...r, valueText: `${pre}${pct}${post}`, percent: pct };
  }
  return { ...r, valueText: `${pre}${fmt(Math.max(1, parse(n!) * factor), n!)}${post}`, percent: typeof r.percent === "number" ? clampPct(r.percent + delta) : r.percent };
}

/** Three sample wards (2, 3 and 4: the four wards of the design map) built from the first ward's rows with other figures, until real wards are entered. */
export function sampleWards(base: WardView, locale: string): WardView[] {
  const variants = [
    { k: 2, factor: 0.85, delta: -9 },
    { k: 3, factor: 1.15, delta: 7 },
    { k: 4, factor: 1.05, delta: -4 },
  ];
  return variants.map(({ k, factor, delta }) => ({
    name: /[0-9०-९]+/.test(base.name) ? base.name.replace(/[0-9०-९]+/, num(k, locale)) : `${base.name} ${num(k, locale)}`,
    wardNo: String(k),
    items: base.items.map((r) => sampleRow(r, factor, delta)),
  }));
}
