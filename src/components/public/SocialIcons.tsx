/** Brand-coloured social network icons (footer, contact page). Decorative: the link carries the label. */

export function FacebookIcon({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1877f2" />
      <path d="M13.3 19v-6.2h2.1l.3-2.5h-2.4V8.8c0-.7.2-1.2 1.2-1.2h1.3V5.4c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.3v1.7H8.6v2.5h2.1V19z" fill="#fff" />
    </svg>
  );
}

/** `gradientId` must be unique on the page when the icon is shown more than once (footer + contact card). */
export function InstagramIcon({ className = "size-6", gradientId = "ig" }: { className?: string; gradientId?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#feda75" />
          <stop offset=".4" stopColor="#d62976" />
          <stop offset="1" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${gradientId})`} />
      <rect x="6" y="6" width="12" height="12" rx="3.5" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="16" cy="8" r="0.9" fill="#fff" />
    </svg>
  );
}

export function YouTubeIcon({ className = "h-6 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="1" y="4" width="22" height="16" rx="5" fill="#f00" />
      <path d="M10 9l5 3-5 3z" fill="#fff" />
    </svg>
  );
}
