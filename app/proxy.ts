import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isAdminSessionValue } from "./lib/admin-session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  const sessionValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const authenticated = isAdminSessionValue(sessionValue);

  if (isLoginPage && authenticated) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (!isLoginPage && pathname.startsWith("/admin") && !authenticated) {
    const loginUrl = new URL("/admin/login", request.url);
    const nextPath = `${pathname}${search}`;
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
