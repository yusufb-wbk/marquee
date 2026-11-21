"use client";

import { ChevronLeftIcon } from "@/components/icons";

export function BackButton({ fallback = "/up-next" }: { fallback?: string }) {
  function onClick() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign(fallback);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold"
    >
      <ChevronLeftIcon className="h-5 w-5" />
      Back
    </button>
  );
}
