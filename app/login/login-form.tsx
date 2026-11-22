"use client";

import { useState, type FormEvent, type ReactNode } from "react";

export function LoginPanel({
  csrf,
  initialMode,
  alert,
  children,
}: {
  csrf: string;
  initialMode: "login" | "signup";
  alert: ReactNode;
  children: ReactNode;
}) {
  const [mode, setMode] = useState(initialMode);
  const [mismatch, setMismatch] = useState(false);
  const creating = mode === "signup";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!creating) {
      return;
    }
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirm")) {
      event.preventDefault();
      setMismatch(true);
    }
  }

  function switchMode() {
    setMismatch(false);
    setMode(creating ? "login" : "signup");
  }

  return (
    <div className="mx-auto grid w-full max-w-md gap-6">
      <h1 className="font-display text-4xl tracking-tight">
        {creating ? "Create account" : "Sign in"}
      </h1>
      {alert}
      <div className="grid gap-4 rounded-2xl border border-line bg-card p-4">
        {children}
        <p className="text-center text-sm text-muted">or</p>
        <form action="/auth/login" method="post" className="grid gap-4" onSubmit={onSubmit}>
          <input type="hidden" name="csrf" value={csrf} />
          <input type="hidden" name="intent" value={creating ? "signup" : "login"} />
          <label className="grid gap-2 text-sm font-medium" htmlFor="email">
            Email
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-12 rounded-xl border border-line bg-background px-4 text-base font-normal text-foreground"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor="password">
            Password
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={creating ? "new-password" : "current-password"}
              required
              minLength={8}
              className="h-12 rounded-xl border border-line bg-background px-4 text-base font-normal text-foreground"
            />
          </label>
          {creating ? (
            <label className="grid gap-2 text-sm font-medium" htmlFor="confirm">
              Confirm password
              <input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="h-12 rounded-xl border border-line bg-background px-4 text-base font-normal text-foreground"
              />
            </label>
          ) : null}
          {mismatch ? (
            <p role="alert" className="text-sm text-danger">
              Those passwords do not match.
            </p>
          ) : null}
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink"
          >
            {creating ? "Create account" : "Log in"}
          </button>
          <p className="text-center text-sm text-muted">or</p>
          <button
            type="button"
            onClick={switchMode}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-base font-semibold text-accent"
          >
            {creating ? "I already have an account" : "No account yet"}
          </button>
        </form>
      </div>
    </div>
  );
}
