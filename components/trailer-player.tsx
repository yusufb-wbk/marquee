"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A YouTube trailer that loads only when tapped: a still image first, then the
 * privacy-enhanced embed. Pages stay light, and YouTube sees nothing until play.
 */
export function TrailerPlayer({ videoKey, title }: { videoKey: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play ${title}`}
      className="group relative block aspect-video w-full overflow-hidden rounded-2xl border border-line bg-card"
    >
      <Image
        src={`https://i.ytimg.com/vi/${videoKey}/hqdefault.jpg`}
        alt=""
        fill
        sizes="(min-width: 1024px) 48rem, 100vw"
        className="object-cover opacity-80 transition-opacity group-hover:opacity-100"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid size-16 place-items-center rounded-full bg-accent text-accent-ink shadow-lg transition-transform group-hover:scale-105">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
        </span>
      </span>
      <span className="absolute bottom-3 left-4 text-sm font-semibold">{title}</span>
    </button>
  );
}
