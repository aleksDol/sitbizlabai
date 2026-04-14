"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import {
  ADMIN_SESSION_COOKIE,
  areAdminCredentialsValid,
  getAdminSessionValue,
} from "@/lib/admin-session";

function shouldUseSecureAdminCookie(): boolean {
  const explicit = process.env.ADMIN_COOKIE_SECURE?.trim().toLowerCase();
  if (explicit === "true" || explicit === "1") {
    return true;
  }

  if (explicit === "false" || explicit === "0") {
    return false;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    return siteUrl.startsWith("https://");
  }

  return process.env.NODE_ENV === "production";
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();

  if (!areAdminCredentialsValid(email, password)) {
    redirect("/admin/login?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, getAdminSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureAdminCookie(),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  if (next.startsWith("/admin")) {
    redirect(next);
  }

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}

export async function deletePostAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  await prisma.post.delete({ where: { id } });
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
}
