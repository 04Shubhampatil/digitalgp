/**
 * Illustrated icons taken from the Figma design (public/icons/figma/*.png, sliced from the design's
 * icon sheets at their native resolution). Rendered as plain images with explicit dimensions so the
 * layout never shifts and the browser downsamples them crisply.
 */
export function FigmaIcon({ name, width, height, className }: { name: string; width: number; height?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static design asset
    <img src={`/icons/figma/${name}.png`} alt="" width={width} height={height ?? width} loading="lazy" decoding="async" className={`select-none object-contain ${className ?? ""}`} draggable={false} />
  );
}

/** Pick a stat icon from an English label (falls back to the position in the Figma strip). */
const STAT_KEYWORDS: [RegExp, string][] = [
  [/population/i, "population"],
  [/household/i, "households"],
  [/agricultur|hectare/i, "agriculture"],
  [/literacy/i, "literacy"],
  [/scheme/i, "schemes"],
  [/school/i, "schools"],
  [/water/i, "water"],
  [/project/i, "projects"],
];
const STAT_ORDER = ["population", "households", "agriculture", "literacy", "schemes", "schools", "water", "projects"];
export function statIconName(labelEn: string | null | undefined, index: number): string {
  const hit = labelEn ? STAT_KEYWORDS.find(([re]) => re.test(labelEn)) : undefined;
  return `stat-${hit ? hit[1] : (STAT_ORDER[index % STAT_ORDER.length] ?? "population")}`;
}

/** Citizen-service icon from an English label or link anchor. */
const SERVICE_KEYWORDS: [RegExp, string][] = [
  [/property/i, "property-tax"],
  [/water/i, "water-tax"],
  [/house/i, "house-tax"],
  [/birth/i, "birth-certificate"],
  [/death/i, "death-certificate"],
  [/marriage/i, "marriage-certificate"],
  [/income/i, "income-certificate"],
  [/caste/i, "caste-certificate"],
  [/residen/i, "residence-certificate"],
  [/aadh?a?a?r/i, "aadhar"],
  [/complaint|grievance/i, "complaint"],
  [/all/i, "all-services"],
];
export function serviceIconName(text: string): string {
  const hit = SERVICE_KEYWORDS.find(([re]) => re.test(text));
  return `svc-${hit ? hit[1] : "all-services"}`;
}
