"use client";

import { CalendarDays, Clock3, Play, Video } from "lucide-react";
import { useState } from "react";

export interface MiniDocumentaryProps {
  title: string;
  description: string;
  /** Uploaded video file (source "upload"). */
  videoSrc?: string;
  /** YouTube / Vimeo player address when the link can be embedded. */
  embedSrc?: string;
  /** The link as published; opened in a new tab when it cannot be embedded. */
  linkUrl?: string;
  thumbnail?: string;
  duration?: string;
  durationText?: string;
  publishedText?: string;
  watchLabel: string;
  playLabel: string;
  playback: { controls?: boolean; muted?: boolean; loop?: boolean };
}

/**
 * Figma "Mini Documentary": thumbnail with the title and duration over it, details on the right and a
 * "Watch Documentary" button. Play (on the picture or the button) swaps the picture for the player;
 * a link that cannot be embedded opens in a new tab instead.
 */
export function MiniDocumentaryClient(p: MiniDocumentaryProps) {
  const [playing, setPlaying] = useState(false);
  const canPlayHere = !!(p.videoSrc || p.embedSrc);
  function play() {
    if (canPlayHere) setPlaying(true);
    else if (p.linkUrl) window.open(p.linkUrl, "_blank", "noopener,noreferrer");
  }
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[691px_minmax(0,1fr)] lg:gap-[50px]">
      <div className="relative aspect-[691/240] w-full overflow-hidden rounded-[10px] bg-black shadow-[0_4px_10px_rgba(0,0,0,0.25)]">
        {playing && p.videoSrc ? (
          <video src={p.videoSrc} controls={p.playback.controls !== false} autoPlay muted={p.playback.muted} loop={p.playback.loop} playsInline className="size-full" />
        ) : playing && p.embedSrc ? (
          <iframe
            src={`${p.embedSrc}${p.embedSrc.includes("?") ? "&" : "?"}autoplay=1`}
            title={p.title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            className="size-full border-0"
          />
        ) : (
          <button type="button" onClick={play} aria-label={`${p.playLabel}: ${p.title}`} className="group absolute inset-0 block text-left">
            {p.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element -- website media / video thumbnail
              <img src={p.thumbnail} alt="" className="absolute inset-0 size-full object-cover" />
            )}
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <span aria-hidden className="absolute top-1/2 left-1/2 flex size-[52px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/60 bg-black/60 text-white transition group-hover:scale-105">
              <Play className="size-5" fill="currentColor" />
            </span>
            <span className="absolute bottom-5 left-5 max-w-[60%] text-[20px] leading-[25px] text-white">{p.title}</span>
            {p.duration && <span className="absolute right-5 bottom-5 rounded-[4px] bg-black/70 px-2 py-0.5 text-[12px] text-white">{p.duration}</span>}
          </button>
        )}
      </div>
      <div>
        <h3 className="max-w-[533px] text-[22px] leading-[27px] text-black">{p.title}</h3>
        {p.description && <p className="mt-4 max-w-[430px] text-[14px] leading-[23px] text-[#414141]">{p.description}</p>}
        {(p.durationText || p.publishedText) && (
          <p className="mt-5 flex flex-wrap gap-x-9 gap-y-2 text-[13px] text-black">
            {p.durationText && (
              <span className="inline-flex items-center gap-2">
                <Clock3 aria-hidden className="size-4 text-[#135130]" /> {p.durationText}
              </span>
            )}
            {p.publishedText && (
              <span className="inline-flex items-center gap-2">
                <CalendarDays aria-hidden className="size-4 text-[#135130]" /> {p.publishedText}
              </span>
            )}
          </p>
        )}
        {(canPlayHere || p.linkUrl) && (
          <button type="button" onClick={play} className="mt-6 inline-flex h-10 items-center gap-3 rounded-[4px] bg-[#135130] px-6 text-[14px] text-white shadow-[0_2px_4px_rgba(0,0,0,0.25)] hover:opacity-90">
            {p.watchLabel}
            <Video aria-hidden className="size-4" fill="currentColor" />
          </button>
        )}
      </div>
    </div>
  );
}
