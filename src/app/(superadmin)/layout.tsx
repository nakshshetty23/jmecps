import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";

// Second-line defense behind the proxy's route gating (src/proxy.ts) — a
// direct Supabase re-check in case a route is ever added under this group
// without updating the proxy's matcher, or the proxy is bypassed some other way.
export default async function SuperAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireRole(["SUPER_ADMIN"]);
  return (
    <div className="flex flex-col">
      <nav className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto flex gap-1 px-4 sm:px-6 lg:px-8">
          {[
            { label: "Overview", href: "/control-center" },
            { label: "Manuscripts", href: "/control-center/manuscripts" },
            { label: "Role Management", href: "/control-center/users" },
            { label: "Journal Settings", href: "/control-center/settings" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-3 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
