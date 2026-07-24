import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  classifyRoute,
  getDashboardPath,
  getUserRole,
  hasPermission,
  isEmailVerified,
  isGatedCategory,
} from "@/lib/auth/rbac";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const category = classifyRoute(pathname);

  const { response: sessionResponse, user } = await updateSession(request);

  if (category === "auth") {
    if (user) {
      return NextResponse.redirect(new URL(getDashboardPath(getUserRole(user)), request.url));
    }
    return sessionResponse;
  }

  if (!isGatedCategory(category)) {
    return sessionResponse;
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!isEmailVerified(user)) {
    return NextResponse.redirect(new URL("/verify-notice", request.url));
  }

  const role = getUserRole(user);
  if (!hasPermission(role, category)) {
    return NextResponse.redirect(new URL("/403", request.url));
  }

  // Forward identity claims to the request so downstream Server Components
  // can read them via next/headers' headers().
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", user.id);
  requestHeaders.set("x-user-role", role);
  requestHeaders.set("x-user-email", user.email ?? "");

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  // Preserve any Set-Cookie headers updateSession attached (session refresh).
  sessionResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
