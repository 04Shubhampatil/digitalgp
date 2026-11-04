import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * State Emblem of India with "सत्यमेव जयते" (the design's own artwork, public/images/emblem.png —
 * a black emblem on a transparent background, 500×500 source). `size` is the height in px; the
 * width follows the artwork's aspect ratio. Pass `onDark` on green/dark backgrounds to render it white.
 */
export function Emblem({ size = 44, onDark = false, framed = false, className }: { size?: number; onDark?: boolean; framed?: boolean; className?: string }) {
  // `framed`: the Figma artwork (public/images/emblem-figma.png, 500×500 with its own margin) in a size×size box,
  // exactly as the public header and footer use it. The emblem keeps its white fill, so it reads on green too.
  if (framed) {
    return <Image src="/images/emblem-figma.png" alt="" width={size} height={size} priority unoptimized className={cn("shrink-0 object-contain", className)} />;
  }
  const width = Math.round(size * (184 / 256));
  return (
    <Image
      src="/images/emblem.png"
      alt=""
      width={width}
      height={size}
      priority
      unoptimized
      className={cn("shrink-0 object-contain", onDark && "brightness-0 invert", className)}
    />
  );
}
