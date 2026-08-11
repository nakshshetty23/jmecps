import "server-only";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isEmailVerified, type Role } from "./rbac";

/**
 * For Server Components. Re-checks against Supabase directly — this is the
 * full, independent verification used whenever the x-user-* header fast
 * path in requireRole() below isn't available. Redirects rather than
 * throwing, since an RSC render can't otherwise short-circuit cleanly.
 */
export async function requireAuth(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  return user;
}

export interface TrustedIdentity {
  id: string;
  role: Role;
  email: string;
}

const KNOWN_ROLES: Role[] = ["RESEARCHER", "ADMIN", "SUPER_ADMIN"];

// x-user-* are only ever set by src/proxy.ts, and only after it has already
// run getUser(), the email-verified check, and a permission check for this
// exact request (src/proxy.ts). src/lib/supabase/middleware.ts strips any
// client-supplied copies of these headers before proxy.ts's gated branch
// gets a chance to re-set them, so a request cannot forge them to skip the
// checks below — if they're present at all, this request already passed
// proxy's checks moments earlier in the same request lifecycle.
async function getTrustedIdentityFromHeaders(): Promise<TrustedIdentity | null> {
  const headerList = await headers();
  const id = headerList.get("x-user-id");
  const role = headerList.get("x-user-role");
  const email = headerList.get("x-user-email");

  if (!id || !role || !KNOWN_ROLES.includes(role as Role)) {
    return null;
  }
  return { id, role: role as Role, email: email ?? "" };
}

/**
 * Second-line defense behind the proxy's route gating (src/proxy.ts). Trusts
 * the x-user-* identity headers when present — proxy.ts already did the real
 * getUser() + email-verified + permission check for this request — which
 * skips a redundant Supabase network round-trip on every protected page
 * load. Falls back to an independent Supabase re-check (requireAuth) when
 * the headers are absent, e.g. a route added under this layout that proxy's
 * route rules don't (yet) classify as gated, or proxy being bypassed some
 * other way — preserving the original defense-in-depth for that case.
 */
export async function requireRole(allowedRoles: Role[]): Promise<TrustedIdentity> {
  const trusted = await getTrustedIdentityFromHeaders();
  if (trusted && allowedRoles.includes(trusted.role)) {
    return trusted;
  }

  const user = await requireAuth();
  if (!isEmailVerified(user)) {
    redirect("/verify-notice");
  }
  if (!allowedRoles.includes(getUserRole(user))) {
    redirect("/403");
  }
  return { id: user.id, role: getUserRole(user), email: user.email ?? "" };
}

type ApiGuardResult = { user: User; error?: never } | { user?: never; error: NextResponse };

/**
 * For Route Handlers / Server Actions, where a redirect isn't the right
 * response — returns a discriminated result instead so the caller can
 * `return result.error` on failure.
 */
export async function requireRoleApi(allowedRoles: Role[]): Promise<ApiGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  if (!isEmailVerified(user)) {
    return {
      error: NextResponse.json({ error: "Please verify your email address." }, { status: 403 }),
    };
  }
  if (!allowedRoles.includes(getUserRole(user))) {
    return {
      error: NextResponse.json(
        { error: "You do not have permission to perform this action." },
        { status: 403 }
      ),
    };
  }
  return { user };
}
