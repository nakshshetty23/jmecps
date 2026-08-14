import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth/guard";
import EmailChangeForm from "@/components/settings/EmailChangeForm";

// Not under (researcher)/(admin)/(superadmin) on purpose: email change is a
// general "manage my own account" action available to any authenticated
// role, not just researchers — putting it under (researcher)/layout.tsx
// would incorrectly block plain ADMIN (editor) accounts via that layout's
// requireRole(["RESEARCHER","SUPER_ADMIN"]) guard. Left ungrouped, this page
// falls through to proxy.ts's default "authenticated" category (any signed-
// in role), the correct scope for this feature — no rbac.ts change needed.
// requireAuth() below is this route's own second-line defense (the same
// role the three role-scoped layouts already provide for their groups),
// since no layout.tsx sits above this page to provide one.
export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="heading-display text-2xl text-primary">Account Settings</CardTitle>
          <CardDescription>Manage your account email.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmailChangeForm currentEmail={user.email ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
