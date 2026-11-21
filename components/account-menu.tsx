import { readCsrfToken } from "@/components/csrf-field";
import { ProfileMenu } from "@/components/profile-menu";
import { getAuthStatus } from "@/lib/auth";

export async function AccountMenu() {
  const status = await getAuthStatus();
  if (status.state !== "signed-in") {
    return null;
  }

  const csrf = await readCsrfToken();
  return <ProfileMenu email={status.user.email ?? "Signed in"} csrf={csrf} />;
}
