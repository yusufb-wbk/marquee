"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { InsightsPanel } from "@/components/insights-panel";
import { PROFILE_TABS, type ProfileTab } from "@/lib/profile-tab";

/**
 * Profile tabs that switch on the device. Watchlist and Watched arrive with the
 * page; Insights loads its own data the first time it is opened. The URL follows
 * the tab (?tab=…) without a reload, so links and refresh still land on it.
 */
export function ProfileView({
  initialTab,
  counts,
  watchlist,
  watched,
}: {
  initialTab: ProfileTab;
  counts: { watchlist: number; watched: number } | null;
  watchlist: ReactNode;
  watched: ReactNode;
}) {
  const [tab, setTab] = useState<ProfileTab>(initialTab);
  // Panels stay mounted once opened, so filters and scroll position survive a switch.
  const [opened, setOpened] = useState<ReadonlySet<ProfileTab>>(() => new Set([initialTab]));
  const tabRefs = useRef<Partial<Record<ProfileTab, HTMLButtonElement | null>>>({});

  function select(next: ProfileTab) {
    setTab(next);
    setOpened((current) => (current.has(next) ? current : new Set([...current, next])));
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    url.searchParams.delete("library");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = PROFILE_TABS.findIndex((item) => item.id === tab);
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    const next = PROFILE_TABS[(index + step + PROFILE_TABS.length) % PROFILE_TABS.length];
    if (next) {
      select(next.id);
      tabRefs.current[next.id]?.focus();
    }
  }

  const panels: Record<ProfileTab, ReactNode> = {
    watchlist,
    watched,
    insights: <InsightsPanel />,
  };

  return (
    <div className="grid gap-6">
      <div role="tablist" aria-label="Profile" className="grid grid-cols-3 gap-1 rounded-2xl bg-card p-1">
        {PROFILE_TABS.map((item) => {
          const selected = item.id === tab;
          const count = item.id === "insights" ? null : (counts?.[item.id] ?? null);
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              type="button"
              role="tab"
              id={`profile-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`profile-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(item.id)}
              onKeyDown={onKeyDown}
              className={
                selected
                  ? "flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-accent px-2 text-sm font-semibold text-accent-ink transition-colors"
                  : "flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition-colors hover:bg-background/60"
              }
            >
              <span className="truncate">{item.label}</span>
              {count === null ? null : <span className="tabular-nums">{count}</span>}
            </button>
          );
        })}
      </div>
      {PROFILE_TABS.map((item) =>
        opened.has(item.id) ? (
          <div
            key={item.id}
            role="tabpanel"
            id={`profile-panel-${item.id}`}
            aria-labelledby={`profile-tab-${item.id}`}
            hidden={item.id !== tab}
          >
            {panels[item.id]}
          </div>
        ) : null,
      )}
    </div>
  );
}
