import { CsrfField } from "@/components/csrf-field";

export function LoginForm() {
  return (
    <form action="/auth/login" method="post" className="grid gap-4">
      <CsrfField />
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
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          name="intent"
          value="login"
          className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink"
        >
          Log in
        </button>
        <button
          type="submit"
          name="intent"
          value="signup"
          className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-line px-4 text-base font-semibold"
        >
          Create account
        </button>
      </div>
    </form>
  );
}
