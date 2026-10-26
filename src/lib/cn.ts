/** Join class names, skipping falsy values. Small enough that we skip clsx/tailwind-merge for now. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
