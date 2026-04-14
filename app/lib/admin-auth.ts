import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "./admin-session";

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return isAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireAdmin(): Promise<void> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    redirect("/admin/login");
  }
}
