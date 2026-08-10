"use client";

import { useState } from "react";
import Link from "next/link";
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
import {
  assignEditorAction,
  getManuscriptAuditTrailAction,
  type TriageQueueRow,
  type AuditTrailEntry,
} from "@/lib/actions/editorial";
import { transitionManuscriptAction } from "@/lib/actions/manuscript-transitions";
import { getNextAllowedStates } from "@/lib/state-machine/manuscript";

function pendingLabel(row: TriageQueueRow): string {
  if (row.daysPending >= 1) return `${row.daysPending} day${row.daysPending === 1 ? "" : "s"} pending`;
  return `${row.hoursPending} hour${row.hoursPending === 1 ? "" : "s"} pending`;
}

function pendingUrgencyClass(row: TriageQueueRow): string {
  if (row.daysPending >= 3) return "border-amber-500/40 text-amber-400 bg-amber-500/10";
  if (row.daysPending >= 1) return "border-accent/40 text-accent bg-accent/10";
  return "border-border text-muted-foreground";
}

interface TriageRowProps {
  row: TriageQueueRow;
  availableEditors: { id: string; fullName: string }[];
  canOverrideState: boolean;
}

function TriageRow({ row, availableEditors, canOverrideState }: TriageRowProps) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditEntries, setAuditEntries] = useState<AuditTrailEntry[] | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  async function handleAssign(editorId: string) {
    setAssigning(true);
    try {
      await assignEditorAction({ manuscriptId: row.id, editorId: editorId || null });
      router.refresh();
    } finally {
      setAssigning(false);
    }
  }

  async function handleOverride(targetStatus: string) {
    if (!targetStatus) return;
    if (!window.confirm(`Override this manuscript's status to ${targetStatus.replace(/_/g, " ")}?`)) return;
    setOverriding(true);
    try {
      await transitionManuscriptAction({ manuscriptId: row.id, targetStatus: targetStatus as never });
      router.refresh();
    } finally {
      setOverriding(false);
    }
  }

  async function openAuditTrail() {
    setAuditOpen(true);
    if (auditEntries) return;
    setAuditLoading(true);
    try {
      const entries = await getManuscriptAuditTrailAction(row.id);
      setAuditEntries(entries);
    } finally {
      setAuditLoading(false);
    }
  }

  const overrideOptions = canOverrideState ? getNextAllowedStates(row.status, "SUPER_ADMIN") : [];

  return (
    <tr className="border-b border-border last:border-0 align-top hover:bg-muted/20">
      <td className="px-3 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs text-muted-foreground">{row.manuscriptCode}</span>
          <span className="font-medium text-foreground">{row.title || "Untitled manuscript"}</span>
          <Badge
            variant="outline"
            className={
              row.sit_conference_flag
                ? "w-fit font-mono text-[0.65rem] border-accent/40 text-accent bg-accent/10"
                : "w-fit font-mono text-[0.65rem] border-primary/40 text-primary bg-primary/10"
            }
          >
            {row.sit_conference_flag ? "SIT_CONF" : "STANDARD"}
          </Badge>
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1">
          <span>{row.primaryAuthorName}</span>
          <span className="text-xs text-muted-foreground">{row.institution}</span>
          {row.hasOrcidOnFile ? (
            <Badge variant="outline" className="w-fit text-[0.65rem] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
              ORCID Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="w-fit text-[0.65rem] border-border text-muted-foreground">
              Connect ORCID
            </Badge>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <Badge variant="outline" className={`text-[0.7rem] ${pendingUrgencyClass(row)}`}>
          {pendingLabel(row)}
        </Badge>
      </td>
      <td className="px-3 py-3">
        <select
          defaultValue={availableEditors.find((e) => e.fullName === row.assignedEditorName)?.id ?? ""}
          onChange={(e) => handleAssign(e.target.value)}
          disabled={assigning}
          className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:border-ring"
        >
          <option value="">Unassigned</option>
          {availableEditors.map((e) => (
            <option key={e.id} value={e.id}>
              {e.fullName}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <Badge variant="outline" className="font-mono text-[0.7rem]">
          {row.status.replace(/_/g, " ")}
        </Badge>
        {row.lockedByActive && <p className="mt-1 text-[0.7rem] text-muted-foreground">Being reviewed</p>}
        {canOverrideState && overrideOptions.length > 0 && (
          <select
            defaultValue=""
            onChange={(e) => handleOverride(e.target.value)}
            disabled={overriding}
            className="mt-1 h-7 w-full rounded-md border border-input bg-transparent px-1.5 text-[0.7rem] outline-none focus-visible:border-ring"
          >
            <option value="">Override state…</option>
            {overrideOptions.map((s) => (
              <option key={s} value={s}>
                → {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col gap-1.5">
          <Button size="sm" variant="outline" render={<Link href={`/review/${row.id}`} />} nativeButton={false}>
            Open
          </Button>
          <Sheet open={auditOpen} onOpenChange={setAuditOpen}>
            <Button size="sm" variant="outline" onClick={openAuditTrail}>
              View Audit Trail
            </Button>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Audit Trail — {row.manuscriptCode}</SheetTitle>
                <SheetDescription>Every lifecycle transition for this manuscript.</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4 pb-4">
                {auditLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {!auditLoading && auditEntries?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No transitions recorded yet.</p>
                )}
                {auditEntries?.map((entry, i) => (
                  <div key={i} className="rounded-md border border-border p-2.5 text-xs">
                    <p className="font-mono">
                      {entry.fromState.replace(/_/g, " ")} → {entry.toState.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {entry.actorName} · {entry.createdAt.toLocaleString("en-US")}
                    </p>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </td>
    </tr>
  );
}

export default function EditorialQueueTable({
  rows,
  availableEditors,
  canOverrideState,
}: {
  rows: TriageQueueRow[];
  availableEditors: { id: string; fullName: string }[];
  canOverrideState: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-card px-3 py-12 text-center">
        <span className="font-mono text-xs text-muted-foreground">SYS_MSG_000</span>
        <p className="text-sm text-muted-foreground">No manuscripts in queue.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card text-left font-mono text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">Manuscript</th>
            <th className="px-3 py-2">Author &amp; Institution</th>
            <th className="px-3 py-2">Verification Age</th>
            <th className="px-3 py-2">Assigned Editor</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Quick Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <TriageRow key={row.id} row={row} availableEditors={availableEditors} canOverrideState={canOverrideState} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
