import type { CoverageWard } from "./CoverageMap";

/**
 * Sample wards for the Scheme Coverage Map, shown only while no real ward figures exist (a placeholder page or a scheme
 * with no coverage recorded yet), so the zoom, ward colours and "click a ward" details can be tried out. Real figures
 * entered in the admin always replace them.
 */
export const DEMO_WARDS: CoverageWard[] = [
  { wardNo: "1", households: 42, beneficiaries: 118 },
  { wardNo: "2", households: 135, beneficiaries: 364 },
  { wardNo: "3", households: 8, beneficiaries: 21 },
];

/**
 * Sample figures for a scheme: the same wards with different numbers per scheme (a stable factor from the scheme id), so
 * switching the "Select Scheme" dropdown visibly changes the ward colours and figures.
 */
export function sampleWardsFor(base: CoverageWard[], schemeId: string): CoverageWard[] {
  let h = 0;
  for (const ch of schemeId) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const factors = [1, 2.4, 0.4, 4, 0.15];
  const f = schemeId ? factors[h % factors.length]! : 1;
  return base.map((w, i) => {
    // Rotate which ward is biggest per scheme, so it is not always Ward 1.
    const shift = schemeId ? (i + (h % base.length)) % base.length : i;
    const households = Math.max(1, Math.round(base[shift]!.households * f));
    return { wardNo: w.wardNo, households, beneficiaries: Math.round(households * 2.7) };
  });
}
