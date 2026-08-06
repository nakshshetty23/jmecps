import { requireRole } from "@/lib/auth/guard";

// Second-line defense behind the proxy's route gating (src/proxy.ts) — a
// direct Supabase re-check in case a route is ever added under this group
// without updating the proxy's matcher, or the proxy is bypassed some other way.
export default async function ResearcherLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireRole(["RESEARCHER", "SUPER_ADMIN"]);
  return <>{children}</>;
}
