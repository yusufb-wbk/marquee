import { CsrfField } from "@/components/csrf-field";
import { getAuthStatus } from "@/lib/auth";

export async function AccountMenu() {
  const status = await getAuthStatus();
  if (status.state !== "signed-in") {
    return null;
  }

  const label = status.user.email ?? "Signed in";

  return (
    <div className="flex items-center gap-3">
      <p className="max-w-40 truncate text-sm text-muted" title={label}>
        {label}
      </p>
      <form action="/auth/signout" method="post">
        <CsrfField />
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-4 text-sm font-medium"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
