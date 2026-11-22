import Link from "next/link";

export const PROFILE_TABS = [
  { id: "watchlist", label: "Watchlist" },
  { id: "watched", label: "Watched" },
  { id: "insights", label: "Insights" },
] as const;

export type ProfileTab = (typeof PROFILE_TABS)[number]["id"];

export function profileTab(value: string): ProfileTab {
  if (value === "watched" || value === "insights") {
    return value;
  }
  return "watchlist";
}

export function ProfileTabs({
  tab,
  counts,
}: {
  tab: ProfileTab;
  counts: { watchlist: number; watched: number } | null;
}) {
  return (
    <div role="tablist" aria-label="Profile" className="grid grid-cols-3 gap-1 rounded-2xl bg-card p-1">
      {PROFILE_TABS.map((item) => {
        const selected = item.id === tab;
        const count = item.id === "insights" ? null : counts?.[item.id] ?? null;
        return (
          <Link
            key={item.id}
            href={`/profile?tab=${item.id}`}
            role="tab"
            aria-selected={selected}
            className={
              selected
                ? "flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-accent px-2 text-sm font-semibold text-accent-ink"
                : "flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold"
            }
          >
            <span className="truncate">{item.label}</span>
            {count === null ? null : <span className="tabular-nums">{count}</span>}
          </Link>
        );
      })}
    </div>
  );
}
