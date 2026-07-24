import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isEmailVerified, type Role } from "./rbac";

/**
 * For Server Components. Re-checks against Supabase directly rather than
 * trusting the x-user-* headers the proxy sets — those are a convenience
 * for lightweight reads, not the security boundary. Redirects rather than
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

export async function requireRole(allowedRoles: Role[]): Promise<User> {
  const user = await requireAuth();

  if (!isEmailVerified(user)) {
    redirect("/verify-notice");
  }
  if (!allowedRoles.includes(getUserRole(user))) {
    redirect("/403");
  }
  return user;
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
