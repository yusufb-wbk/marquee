import type { ShowStatus } from "@/lib/library/database";

const OPTIONS: { status: ShowStatus; label: string }[] = [
  { status: "watching", label: "Watching" },
  { status: "watchlist", label: "Watchlist" },
  { status: "stopped", label: "Stopped" },
];

export function ShowStatusForm({
  showId,
  current,
  nextPath,
}: {
  showId: number;
  current: ShowStatus | null;
  nextPath: string;
}) {
  return (
    <form action="/library/show" method="post" className="grid gap-3">
      <input type="hidden" name="tmdbId" value={showId} />
      <input type="hidden" name="next" value={nextPath} />
      <div className="flex flex-col gap-2 sm:flex-row">
        {OPTIONS.map((option) => {
          const selected = current === option.status;
          return (
            <button
              key={option.status}
              type="submit"
              name="status"
              value={option.status}
              aria-pressed={selected}
              className={
                selected
                  ? "inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink"
                  : "inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold"
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {current ? (
        <button
          type="submit"
          name="status"
          value="remove"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-line px-4 text-sm font-semibold"
        >
          Remove from my list
        </button>
      ) : null}
    </form>
  );
}
