import Link from "next/link";

import { ImportIcon } from "@/components/icons";
import { getAuthStatus } from "@/lib/auth";

/** Header button to bring in your lists from other apps. Signed-in users only. */
export async function SignedInImport() {
  const status = await getAuthStatus();
  if (status.state !== "signed-in") {
    return null;
  }
  return (
    <Link
      href="/import"
      aria-label="Import your lists"
      className="grid size-11 place-items-center rounded-2xl border border-line text-foreground transition-colors hover:border-accent/60 hover:text-accent"
    >
      <ImportIcon className="size-5" />
    </Link>
  );
}
