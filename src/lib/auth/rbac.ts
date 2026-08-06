import type { User } from "@supabase/supabase-js";

export type Role = "VISITOR" | "RESEARCHER" | "ADMIN" | "SUPER_ADMIN";

export const ROLE_HIERARCHY: Record<Exclude<Role, "VISITOR">, number> = {
  RESEARCHER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export type RouteCategory = "public" | "auth" | "researcher" | "admin" | "super-admin";
type GatedCategory = Exclude<RouteCategory, "public" | "auth">;

const ROUTE_RULES: { prefix: string; category: RouteCategory }[] = [
  { prefix: "/login", category: "auth" },
  { prefix: "/register", category: "auth" },
  { prefix: "/dashboard", category: "researcher" },
  { prefix: "/submissions", category: "researcher" },
  { prefix: "/review", category: "admin" },
  { prefix: "/control-center", category: "super-admin" },
];

// Domain-bounded, not a `role >= required` hierarchy: RESEARCHER and ADMIN
// are mutually exclusive over each other's routes. Only SUPER_ADMIN has
// universal access. (A naive numeric comparison would wrongly let ADMIN
// into researcher routes, since ADMIN > RESEARCHER in ROLE_HIERARCHY.)
const ALLOWED_ROLES: Record<GatedCategory, Role[]> = {
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
  const rule = ROUTE_RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)
  );
  return rule?.category ?? "public";
}

export function isGatedCategory(category: RouteCategory): category is GatedCategory {
  return category === "researcher" || category === "admin" || category === "super-admin";
}

export function hasPermission(role: Role, category: GatedCategory): boolean {
  return ALLOWED_ROLES[category].includes(role);
}

export function getDashboardPath(role: Role): string {
  return role === "VISITOR" ? "/" : DASHBOARD_PATH[role];
}

export function getUserRole(user: User): Role {
  return (user.user_metadata?.role as Role | undefined) ?? "RESEARCHER";
}

export function isEmailVerified(user: User): boolean {
  return user.email_confirmed_at != null;
}

// Guards against open-redirect via a crafted `?callbackUrl=` — must be a
// same-origin relative path. Rejects absolute URLs (`https://evil.com`),
// protocol-relative URLs (`//evil.com`, which browsers resolve to the
// current scheme + evil.com's host), and backslash tricks some browsers
// still normalize into `//`.
export function getSafeCallbackUrl(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}
