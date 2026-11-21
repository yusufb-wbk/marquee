import { AppNav } from "@/components/app-nav";
import { getAuthStatus } from "@/lib/auth";

export async function SignedInNav() {
  const status = await getAuthStatus();
  if (status.state !== "signed-in") {
    return null;
  }
  return <AppNav />;
}
