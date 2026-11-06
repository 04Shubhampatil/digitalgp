import {
  ChartNoAxesCombined,
  CircleEllipsis,
  Cross,
  Droplet,
  Flower2,
  Footprints,
  HandCoins,
  Presentation,
  Route,
  Sparkles,
  ClipboardCheck,
  Toilet,
  TrafficCone,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * Extra icon names for the Figma Infrastructure and Finance pages (looked up after the main table in kit.tsx).
 * Names are the lower-case, letters-and-digits-only form of the stored icon name.
 */

/** Solid single droplet (Figma "Water" pictogram). */
function SolidDrop(props: LucideProps) {
  return <Droplet {...props} fill="currentColor" />;
}

/** Three solid bars rising left to right (Figma "Our Focus"). */
function BarsFilled({ className }: LucideProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <rect x="3" y="13" width="5" height="8" rx="1.6" />
      <rect x="9.5" y="8" width="5" height="13" rx="1.6" />
      <rect x="16" y="3" width="5" height="18" rx="1.6" />
    </svg>
  );
}

/** Rupee sign inside a dashed square (Figma "New Members" tile). */
function RupeeBox({ className }: LucideProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="3.5"
        strokeDasharray="3.6 2.6"
      />
      <path d="M8.5 7.5h7M8.5 10.5h7M8.5 7.5c3.6 0 3.6 4.2 0 4.2h-.6l4.6 4.8" />
    </svg>
  );
}

export const EXTRA_ICONS: Record<string, LucideIcon> = {
  drop: SolidDrop as unknown as LucideIcon,
  barsfilled: BarsFilled as unknown as LucideIcon,
  rupeebox: RupeeBox as unknown as LucideIcon,
  growthbars: ChartNoAxesCombined,
  handcoins: HandCoins,
  toilet: Toilet,
  route: Route,
  roads: Route,
  cross: Cross,
  ellipsis: CircleEllipsis,
  cone: TrafficCone,
  presentation: Presentation,
  sparkles: Sparkles,
  footprints: Footprints,
  flower: Flower2,
  clipboard: ClipboardCheck,
};
