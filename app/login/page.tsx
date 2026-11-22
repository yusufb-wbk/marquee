import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { CsrfField } from "@/components/csrf-field";
import { authAlert } from "@/app/login/messages";
import { Message } from "@/components/message";
import { PageSkeleton } from "@/components/page-skeleton";
import { SetupPanel } from "@/components/setup-panel";
import { getAuthStatus } from "@/lib/auth";
import { firstQueryValue } from "@/lib/format";

export const metadata = {
  title: "Log in",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense fallback={<PageSkeleton kind="form" />}>
      <LoginGate searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginGate({ searchParams }: LoginPageProps) {
  const status = await getAuthStatus();
  if (status.state === "signed-in") {
    redirect("/up-next");
  }

  if (status.state === "unconfigured") {
    return (
      <div className="grid gap-6">
        <header className="grid gap-2">
          <h1 className="font-display text-4xl tracking-tight">Sign in</h1>
          <p className="text-muted">
            Marquee needs a Supabase project before it can keep you signed in.
          </p>
        </header>
        <SetupPanel />
      </div>
    );
  }

  const params = await searchParams;
  const code = firstQueryValue(params.error);
  const alert = code.length > 0 ? authAlert(code) : null;

  return (
    <div className="mx-auto grid w-full max-w-md gap-6">
      <header className="grid gap-2">
        <h1 className="font-display text-4xl tracking-tight">Sign in</h1>
        <p className="leading-7 text-muted">
          Continue with Google, or use an email and password. Marquee keeps
          only a session cookie.
        </p>
      </header>
      {alert ? (
        <Message tone={alert.tone} title={alert.title}>
          {alert.body}
        </Message>
      ) : null}
      <div className="grid gap-4 rounded-2xl border border-line bg-card p-4">
        <form action="/auth/google" method="post">
          <CsrfField />
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-line px-4 text-base font-semibold"
          >
            Continue with Google
          </button>
        </form>
        <p className="text-center text-sm text-muted">or use email</p>
        <LoginForm />
      </div>
    </div>
  );
}
