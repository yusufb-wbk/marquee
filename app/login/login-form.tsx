"use client";

import { useActionState } from "react";

import { authenticate, type AuthFormState } from "@/app/login/actions";

const initialState: AuthFormState = { error: null, notice: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    authenticate,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-4">
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
          autoComplete="current-password"
          required
          minLength={8}
          className="h-12 rounded-xl border border-line bg-background px-4 text-base font-normal text-foreground"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p role="status" className="text-sm text-notice">
          {state.notice}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          name="intent"
          value="login"
          disabled={pending}
          className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink disabled:opacity-60"
        >
          {pending ? "Please wait…" : "Log in"}
        </button>
        <button
          type="submit"
          name="intent"
          value="signup"
          disabled={pending}
          className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-line px-4 text-base font-semibold disabled:opacity-60"
        >
          Create account
        </button>
      </div>
    </form>
  );
}
