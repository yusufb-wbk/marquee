"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const PAGE_SIZE = 60;

/**
 * Shows a long list a page at a time. The next page loads when the end of the
 * list scrolls into view; the button is there for keyboards and old browsers.
 * Starts over at the first page whenever `items` changes (a new filter or sort).
 */
export function useIncremental<T>(items: readonly T[], pageSize = PAGE_SIZE) {
  const [limit, setLimit] = useState(pageSize);
  const [source, setSource] = useState(items);
  const showMore = useCallback(() => setLimit((current) => current + pageSize), [pageSize]);
  if (source !== items) {
    setSource(items);
    setLimit(pageSize);
  }
  return {
    shown: items.slice(0, limit),
    remaining: Math.max(0, items.length - limit),
    showMore,
  };
}

export function ShowMore({ remaining, onMore }: { remaining: number; onMore: () => void }) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || remaining === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onMore();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [remaining, onMore]);

  if (remaining === 0) {
    return null;
  }
  return (
    <div ref={sentinel} className="flex justify-center">
      <button
        type="button"
        onClick={onMore}
        className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-semibold"
      >
        Show more ({remaining})
      </button>
    </div>
  );
}
