import type { User } from "@supabase/supabase-js";

export type Role = "VISITOR" | "RESEARCHER" | "ADMIN" | "SUPER_ADMIN";

export const ROLE_HIERARCHY: Record<Exclude<Role, "VISITOR">, number> = {
  RESEARCHER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

// "authenticated" = Phase 2's guest-access restriction: any route not
// explicitly public and not one of the role-scoped categories below still
// requires *some* signed-in session, but doesn't narrow by role the way
// researcher/admin/super-admin do.
export type RouteCategory = "public" | "auth" | "authenticated" | "researcher" | "admin" | "super-admin";
type GatedCategory = Exclude<RouteCategory, "public" | "auth">;

const ROUTE_RULES: { prefix: string; category: RouteCategory }[] = [
  { prefix: "/login", category: "auth" },
  { prefix: "/register", category: "auth" },
  // Same treatment as /login and /register: a signed-in user has no need
  // to request a reset for themselves, so send them to their dashboard
  // instead (Phase 1.3.5.1). Unlike /reset-password below, visiting this
  // page never establishes a session, so there's no risk of the "signed-in
  // user gets redirected away mid-flow" problem that page has to avoid.
  { prefix: "/forgot-password", category: "auth" },
  { prefix: "/dashboard", category: "researcher" },
  { prefix: "/submissions", category: "researcher" },
  { prefix: "/review", category: "admin" },
  { prefix: "/control-center", category: "super-admin" },
];

// The only routes reachable with no session at all (Phase 2): the
// homepage, plus system/redirect-target pages that must never themselves
// require auth — verify-notice is where an unverified signed-in user
// already gets sent, and 403 is where a wrong-role user already gets sent;
// gating either would create a redirect loop or a confusing detour.
// Exact-match only ("/" as a prefix would swallow every route).
//
// The Razorpay webhook (Phase 3) is also listed here — NOT because it's a
// guest-accessible page, but because it's a machine-to-machine request
// authenticated by gateway signature (see src/app/api/webhooks/razorpay/
// route.ts), never by a Supabase session. It would otherwise fall into the
// "authenticated" default below and get redirected to /login, which
// Razorpay's server can't follow — breaking the webhook entirely. This is
// a single exact path, not a broad /api/* exemption.
//
// /reset-password (Phase 1.3.5.1) is here rather than in ROUTE_RULES'
// "auth" category on purpose: clicking a real recovery link establishes a
// Supabase session client-side (that's the whole point — see that page's
// onAuthStateChange handling), and "auth" category redirects any
// already-signed-in visitor away to their dashboard. If this page were
// "auth"-classified, the moment the recovery session lands, a page refresh
// (or the very next server-rendered check) would boot the user out before
// they could ever set a new password. Public/unconditional access here —
// matching verify-notice/403's own "must never itself require auth"
// reasoning — lets the page's own client-side logic decide what to show
// regardless of whether a session exists yet.
const PUBLIC_EXACT_PATHS = new Set<string>(["/", "/verify-notice", "/403", "/reset-password", "/api/webhooks/razorpay"]);

// Domain-bounded, not a `role >= required` hierarchy: RESEARCHER and ADMIN
// are mutually exclusive over each other's routes. Only SUPER_ADMIN has
// universal access. (A naive numeric comparison would wrongly let ADMIN
// into researcher routes, since ADMIN > RESEARCHER in ROLE_HIERARCHY.)
const ALLOWED_ROLES: Record<GatedCategory, Role[]> = {
  authenticated: ["RESEARCHER", "ADMIN", "SUPER_ADMIN"],
  researcher: ["RESEARCHER", "SUPER_ADMIN"],
  admin: ["ADMIN", "SUPER_ADMIN"],
  "super-admin": ["SUPER_ADMIN"],
};

const DASHBOARD_PATH: Record<Exclude<Role, "VISITOR">, string> = {
  RESEARCHER: "/dashboard",
  ADMIN: "/review",
  SUPER_ADMIN: "/control-center",
};

export function classifyRoute(pathname: string): RouteCategory {
  if (PUBLIC_EXACT_PATHS.has(pathname)) return "public";
  const rule = ROUTE_RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );
  if (rule) return rule.category;
  // Default-protected (Phase 2): anything not explicitly listed above
  // requires a signed-in session, regardless of role.
  return "authenticated";
}

export function isGatedCategory(category: RouteCategory): category is GatedCategory {
  return category === "authenticated" || category === "researcher" || category === "admin" || category === "super-admin";
}

export function hasPermission(role: Role, category: GatedCategory): boolean {
  return ALLOWED_ROLES[category].includes(role);
}

export function getDashboardPath(role: Role): string {
  return role === "VISITOR" ? "/" : DASHBOARD_PATH[role];
}

// Reads from app_metadata (raw_app_meta_data), not user_metadata
// (raw_user_meta_data). This distinction is load-bearing: Supabase's client
// SDK lets any signed-in user rewrite their own user_metadata directly —
// supabase.auth.updateUser({ data: { role: "SUPER_ADMIN" } }) succeeds for
// anyone — while app_metadata can only be written via direct SQL or the
// Admin API (service role), neither of which a client can reach. Every role
// write in this app goes through updateUserRoleAction's $executeRaw against
// raw_app_meta_data (src/lib/actions/admin-system.ts) for exactly this
// reason. If getUserRole ever reads user_metadata again, self-escalation to
// SUPER_ADMIN is one browser console call away.
export function getUserRole(user: User): Role {
  return (user.app_metadata?.role as Role | undefined) ?? "RESEARCHER";
}

export function isEmailVerified(user: User): boolean {
  return user.email_confirmed_at != null;
}

// Guards against open-redirect via a crafted `?callbackUrl=` — must be a
// same-origin relative path. Rejects absolute URLs (`https://evil.com`),
// protocol-relative URLs (`//evil.com`, which browsers resolve to the
// current scheme + evil.com's host), and backslash tricks some browsers
// still normalize into `//`.
//
// Strips ASCII tab/CR/LF before validating — the WHATWG URL Standard (what
// every browser actually uses to parse a URL, including the assignment in
// login/page.tsx's `window.location.href = callbackUrl`) removes those
// characters from anywhere in the string, not just the ends. Without this,
// "/\t/evil.com" passes a naive startsWith("//") check (it doesn't
// literally start with "//") but the browser still collapses it to
// "//evil.com" — a real, demonstrated open redirect. Validating the same
// stripped string that will actually be navigated to closes that gap.
export function getSafeCallbackUrl(raw: string | null): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/[\t\r\n]/g, "");
  if (!stripped.startsWith("/")) return null;
  if (stripped.startsWith("//") || stripped.startsWith("/\\")) return null;
  return stripped;
}
