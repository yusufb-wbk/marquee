import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { authAlert } from "@/app/login/messages";
import { Message } from "@/components/message";
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
    <Suspense fallback={<p className="text-muted">Loading sign in…</p>}>
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
          Use your email and a password. Marquee sends them to Supabase from
          the server and stores only a session cookie.
        </p>
      </header>
      {alert ? (
        <Message tone={alert.tone} title={alert.title}>
          {alert.body}
        </Message>
      ) : null}
      <div className="rounded-2xl border border-line bg-card p-4">
        <LoginForm />
      </div>
    </div>
  );
}
