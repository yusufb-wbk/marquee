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

export function ProfileTabs({ tab }: { tab: ProfileTab }) {
  return (
    <div role="tablist" aria-label="Profile" className="flex gap-2">
      {PROFILE_TABS.map((item) => {
        const selected = item.id === tab;
        return (
          <Link
            key={item.id}
            href={`/profile?tab=${item.id}`}
            role="tab"
            aria-selected={selected}
            className={
              selected
                ? "inline-flex h-11 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink"
                : "inline-flex h-11 items-center rounded-full border border-line px-4 text-sm font-semibold"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
