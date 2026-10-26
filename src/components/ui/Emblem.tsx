import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * National emblem placeholder. The Figma uses the Ashoka emblem PNG; the real asset goes in
 * public/images/emblem.png (government branding, circular rule 1). Until it is added, an
 * inline SVG keeps the layout intact.
 */
export function Emblem({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/images/emblem.svg"
      alt=""
      width={size}
      height={size}
      priority
      unoptimized
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
