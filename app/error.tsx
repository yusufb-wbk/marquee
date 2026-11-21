"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid gap-4" role="alert">
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="text-muted">
        Marquee hit an unexpected error. It may be a dropped connection.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-12 w-fit items-center justify-center rounded-xl bg-accent px-5 font-semibold text-accent-ink"
      >
        Try again
      </button>
    </div>
  );
}
