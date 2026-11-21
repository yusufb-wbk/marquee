"use client";

import { useSyncExternalStore } from "react";

type ThemeName = "dark" | "light";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function currentTheme(): ThemeName {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function serverTheme(): ThemeName {
  return "dark";
}

function publish(next: ThemeName) {
  document.documentElement.dataset.theme = next;
  document.cookie = `theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  for (const listener of listeners) {
    listener();
  }
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, serverTheme);
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => {
        publish(next);
      }}
      className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-3 text-sm font-medium"
    >
      {next === "light" ? "Light" : "Dark"}
    </button>
  );
}
