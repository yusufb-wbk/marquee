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
      className="inline-flex h-9 w-fit items-center justify-self-start gap-1 rounded-full border border-line px-2.5 text-sm font-semibold"
    >
      <ChevronLeftIcon className="h-4 w-4" />
      Back
    </button>
  );
}
