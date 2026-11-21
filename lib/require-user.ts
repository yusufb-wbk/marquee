import { redirect } from "next/navigation";

import { getAuthStatus, type CurrentUser } from "@/lib/auth";

export async function requireUser(): Promise<CurrentUser> {
  const status = await getAuthStatus();
  if (status.state === "signed-in") {
    return status.user;
  }
  redirect("/login");
}
