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
