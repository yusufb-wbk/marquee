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
  const [showPassword, setShowPassword] = useState(false);
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
    setShowPassword(false);
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
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={creating ? "new-password" : "current-password"}
                required
                minLength={8}
                className="h-12 w-full rounded-xl border border-line bg-background pl-4 pr-12 text-base font-normal text-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                aria-controls={creating ? "password confirm" : "password"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted hover:text-foreground"
              >
                <EyeIcon crossed={showPassword} />
              </button>
            </div>
          </label>
          {creating ? (
            <label className="grid gap-2 text-sm font-medium" htmlFor="confirm">
              Confirm password
              <input
                id="confirm"
                name="confirm"
                type={showPassword ? "text" : "password"}
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
            {creating ? "I already have an account" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed ? <path d="M3 3l18 18" /> : null}
    </svg>
  );
}
