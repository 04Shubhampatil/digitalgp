import { ChevronRight } from "lucide-react";
import Link from "next/link";

/**
 * Cursor pagination control for server-rendered lists: the backend only returns `nextCursor`, so
 * the UI offers "next" (and "first page" to reset). Preserves the other query params.
 */
export function CursorPager({
  basePath,
  params,
  nextCursor,
  shown,
  labels,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  nextCursor: string | null;
  shown: number;
  labels: { showing: string; first: string; next: string };
}) {
  const build = (cursor?: string) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "cursor") sp.set(k, v);
    if (cursor) sp.set("cursor", cursor);
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const onFirstPage = !params.cursor;

  return (
    <div className="flex items-center justify-between px-5 py-3 text-xs text-muted">
      <span>{labels.showing.replace("{count}", String(shown))}</span>
      <div className="flex items-center gap-2">
        {!onFirstPage && (
          <Link href={build()} className="rounded-button border border-line px-3 py-1.5 font-semibold text-primary hover:bg-surface-soft">
            {labels.first}
          </Link>
        )}
        {nextCursor && (
          <Link
            href={build(nextCursor)}
            className="inline-flex items-center gap-1 rounded-button bg-primary px-3 py-1.5 font-semibold text-white hover:bg-primary-hover"
          >
            {labels.next} <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
