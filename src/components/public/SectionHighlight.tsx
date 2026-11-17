"use client";

import { useEffect } from "react";

/**
 * "View on website" from the page editor opens the public page with `?highlight=<sectionKey>`: this scrolls to that
 * section and frames it for a few seconds, so the editor does not have to look for the block they changed.
 * A section that shares a row with another is found through the row's `data-sections` list. The page streams in,
 * so the section is looked for until it is there (up to about ten seconds).
 */
export function SectionHighlight() {
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("highlight");
    if (!key || !/^[a-z0-9-]{1,60}$/.test(key)) return;
    let frame: HTMLDivElement | null = null;
    let tries = 0;
    const timers: number[] = [];
    const show = (target: HTMLElement) => {
      target.scrollIntoView({ block: "start" });
      // Pictures above may still be loading: measure once the scroll has settled.
      timers.push(
        window.setTimeout(() => {
          target.scrollIntoView({ block: "start" });
          const r = target.getBoundingClientRect();
          frame = document.createElement("div");
          frame.setAttribute("aria-hidden", "true");
          frame.dataset.sectionHighlight = key;
          frame.style.cssText = `position:absolute;left:${r.left + window.scrollX + 6}px;top:${r.top + window.scrollY + 4}px;width:${r.width - 12}px;height:${r.height - 8}px;border:3px solid #ff9933;border-radius:12px;box-shadow:0 0 0 6px rgba(255,153,51,.25);pointer-events:none;z-index:25;transition:opacity .6s`;
          document.body.appendChild(frame);
          timers.push(window.setTimeout(() => frame && (frame.style.opacity = "0"), 6000));
          timers.push(window.setTimeout(() => frame?.remove(), 6700));
        }, 700),
      );
    };
    const look = () => {
      const target = document.getElementById(key) ?? document.querySelector<HTMLElement>(`[data-sections~="${key}"]`);
      if (target) show(target);
      else if (++tries < 35) timers.push(window.setTimeout(look, 300));
    };
    timers.push(window.setTimeout(look, 300));
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      frame?.remove();
    };
  }, []);
  return null;
}
