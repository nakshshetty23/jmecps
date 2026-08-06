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
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const ONE_MINUTE_MS = 60 * 1000;

// Note on what this actually protects: /login and /register submit via
// client-side JS calling Supabase directly (never touching this proxy) —
// so this limits how often an IP can load *our page*, not the underlying
// signInWithPassword/signUp calls themselves (those hit Supabase's own API
// and are subject to Supabase's own rate limiting — the same
// over_email_send_rate_limit this project has already hit in testing).
// Real protection against direct API abuse, not just our page.
const RATE_LIMITS: { prefix: string; limit: number; windowMs: number }[] = [
  { prefix: "/login", limit: 5, windowMs: ONE_MINUTE_MS },
  { prefix: "/register", limit: 5, windowMs: ONE_MINUTE_MS },
  { prefix: "/search", limit: 60, windowMs: ONE_MINUTE_MS },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const category = classifyRoute(pathname);

  const rateLimitRule = RATE_LIMITS.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  if (rateLimitRule) {
    const ip = getClientIp(request.headers);
    const result = checkRateLimit(`${rateLimitRule.prefix}:${ip}`, rateLimitRule.limit, rateLimitRule.windowMs);
    if (!result.allowed) {
      return new NextResponse("Too many requests. Please try again shortly.", {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)) },
      });
    }
  }

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
