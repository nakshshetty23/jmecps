"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { assignManuscriptToIssueAction, removeManuscriptFromIssueAction, type IssueManuscriptRow } from "@/lib/actions/issues";

function ManuscriptRow({
  row,
  actionLabel,
  onAct,
}: {
  row: IssueManuscriptRow;
  actionLabel: string;
  onAct: (manuscriptId: string) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await onAct(row.id);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-mono text-xs text-muted-foreground">{row.manuscriptCode}</span>
        <span className="truncate text-sm text-foreground">{row.title}</span>
        <span className="text-xs text-muted-foreground">{row.primaryAuthorName}</span>
        <span className="text-xs text-muted-foreground">
          {row.publishedAt ? `Published ${row.publishedAt.toLocaleDateString("en-US")}` : "Publication date unavailable"}
        </span>
      </div>
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={handleClick} className="shrink-0">
        {pending ? "Working…" : actionLabel}
      </Button>
    </div>
  );
}

export default function IssueManuscriptAssignments({
  issueId,
  assignedManuscripts,
  availableManuscripts,
}: {
  issueId: string;
  assignedManuscripts: IssueManuscriptRow[];
  availableManuscripts: IssueManuscriptRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleAssign(manuscriptId: string) {
    setError(null);
    const result = await assignManuscriptToIssueAction({ issueId, manuscriptId });
    if (!result.success) {
      setError(result.errors?._form?.[0] ?? "Could not assign manuscript.");
      return;
    }
    router.refresh();
  }

  async function handleRemove(manuscriptId: string) {
    setError(null);
    const result = await removeManuscriptFromIssueAction({ manuscriptId });
    if (!result.success) {
      setError(result.errors?._form?.[0] ?? "Could not remove manuscript.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">Assigned Published Manuscripts</h3>
        <div className="rounded-md border border-border">
          {assignedManuscripts.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No published manuscripts assigned to this issue yet.
            </p>
          ) : (
            assignedManuscripts.map((row) => (
              <ManuscriptRow key={row.id} row={row} actionLabel="Remove" onAct={handleRemove} />
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">Available Published Manuscripts</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Published manuscripts not currently assigned to any issue.
        </p>
        <div className="rounded-md border border-border">
          {availableManuscripts.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No unassigned published manuscripts available.
            </p>
          ) : (
            availableManuscripts.map((row) => (
              <ManuscriptRow key={row.id} row={row} actionLabel="Assign" onAct={handleAssign} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
