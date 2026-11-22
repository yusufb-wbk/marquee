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
    <div role="tablist" aria-label="Profile" className="grid grid-cols-3 gap-2">
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
                ? "grid h-14 content-center justify-items-center rounded-full bg-accent text-sm font-semibold text-accent-ink"
                : "grid h-14 content-center justify-items-center rounded-full border border-line text-sm font-semibold"
            }
          >
            <span>{item.label}</span>
            {count === null ? null : (
              <span className="text-xs tabular-nums">{count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
