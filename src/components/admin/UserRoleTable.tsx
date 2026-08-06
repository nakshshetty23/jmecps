"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { updateUserRoleAction, getUserRoleAuditTrailAction, type UserRow, type RoleAuditEntry } from "@/lib/actions/admin-system";
import type { UserRole } from "@/generated/prisma/client";

// This app's actual roles — not the AUTHOR/REVIEWER/EDITOR/MANAGING_EDITOR
// set from the task spec, which doesn't exist in this codebase's RBAC
// (src/lib/auth/rbac.ts). RESEARCHER/ADMIN/SUPER_ADMIN are the real,
// domain-bounded roles every guard and the state machine already use.
// VISITOR is the "no role" fallback, not something to manually assign.
const ASSIGNABLE_ROLES: UserRole[] = ["RESEARCHER", "ADMIN", "SUPER_ADMIN"];

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    VISITOR: "border-border text-muted-foreground",
    RESEARCHER: "border-primary/40 text-primary bg-primary/10",
    ADMIN: "border-accent/40 text-accent bg-accent/10",
    SUPER_ADMIN: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  };
  return (
    <Badge variant="outline" className={`font-mono text-[0.7rem] ${styles[role]}`}>
      {role}
    </Badge>
  );
}

function UserRoleRow({ user, currentUserId }: { user: UserRow; currentUserId: string }) {
  const router = useRouter();
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditEntries, setAuditEntries] = useState<RoleAuditEntry[] | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  async function handleRoleChange(newRole: UserRole) {
    if (newRole === user.role) return;
    if (!window.confirm(`Change ${user.fullName}'s role from ${user.role} to ${newRole}?`)) return;

    setError(null);
    setChanging(true);
    try {
      const result = await updateUserRoleAction({ userId: user.id, newRole });
      if (!result.success) {
        setError(result.errors?._form?.[0] ?? "Could not change this user's role.");
        return;
      }
      router.refresh();
    } finally {
      setChanging(false);
    }
  }

  async function openAuditTrail() {
    setAuditOpen(true);
    if (auditEntries) return;
    setAuditLoading(true);
    try {
      setAuditEntries(await getUserRoleAuditTrailAction(user.id));
    } finally {
      setAuditLoading(false);
    }
  }

  return (
    <tr className="border-b border-border last:border-0 align-top hover:bg-muted/20">
      <td className="px-3 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{user.fullName}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      </td>
      <td className="px-3 py-3">
        <Badge variant="outline" className={`text-[0.7rem] ${user.emailVerified ? "border-emerald-500/40 text-emerald-400" : "border-border text-muted-foreground"}`}>
          {user.emailVerified ? "Verified" : "Unverified"}
        </Badge>
      </td>
      <td className="px-3 py-3 font-mono text-sm">{user.manuscriptCount}</td>
      <td className="px-3 py-3">
        <RoleBadge role={user.role} />
      </td>
      <td className="px-3 py-3">
        {user.id === currentUserId ? (
          <span className="text-xs text-muted-foreground">You can&apos;t change your own role</span>
        ) : (
          <select
            value={user.role}
            onChange={(e) => handleRoleChange(e.target.value as UserRole)}
            disabled={changing}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </td>
      <td className="px-3 py-3">
        <Sheet open={auditOpen} onOpenChange={setAuditOpen}>
          <Button size="sm" variant="outline" onClick={openAuditTrail}>
            Role History
          </Button>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Role Change History — {user.fullName}</SheetTitle>
              <SheetDescription>Every role change made to this account.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-3 px-4 pb-4">
              {auditLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!auditLoading && auditEntries?.length === 0 && (
                <p className="text-sm text-muted-foreground">No role changes recorded.</p>
              )}
              {auditEntries?.map((entry, i) => (
                <div key={i} className="rounded-md border border-border p-2.5 text-xs">
                  <p className="font-mono">
                    {entry.previousRole} → {entry.newRole}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    by {entry.changedByName} · {entry.createdAt.toLocaleString("en-US")}
                  </p>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </td>
    </tr>
  );
}

export default function UserRoleTable({ rows, currentUserId }: { rows: UserRow[]; currentUserId: string }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-card px-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">No users match this search.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card text-left font-mono text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Manuscripts</th>
            <th className="px-3 py-2">Role</th>
            <th className="px-3 py-2">Change Role</th>
            <th className="px-3 py-2">Audit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((user) => (
            <UserRoleRow key={user.id} user={user} currentUserId={currentUserId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
