"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { markPaymentReceivedAction, publishManuscriptAction, type WorkflowRow } from "@/lib/actions/publication";
import type { ManuscriptStatus } from "@/generated/prisma/client";

const STATUS_STYLES: Partial<Record<ManuscriptStatus, string>> = {
  SUBMITTED: "border-accent/40 text-accent bg-accent/10",
  UNDER_REVIEW: "border-accent/40 text-accent bg-accent/10",
  RESUBMITTED: "border-accent/40 text-accent bg-accent/10",
  REVISION_REQUIRED: "border-accent/40 text-accent bg-accent/10",
  APPROVED: "border-primary/40 text-primary bg-primary/10",
  PAYMENT_PENDING: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  PAYMENT_COMPLETED: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  REJECTED: "border-destructive/40 text-destructive bg-destructive/10",
};

function StatusBadge({ status }: { status: ManuscriptStatus }) {
  return (
    <Badge variant="outline" className={`font-mono text-[0.7rem] ${STATUS_STYLES[status] ?? "border-border text-muted-foreground"}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function WorkflowRowActions({ row }: { row: WorkflowRow }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkPaymentReceived() {
    if (
      !window.confirm(
        "Record an OFFLINE/manual payment for this manuscript? Use this only for waivers or off-gateway arrangements — a real Razorpay payment is confirmed automatically."
      )
    )
      return;
    setError(null);
    setPending(true);
    try {
      const result = await markPaymentReceivedAction(row.id);
      if (!result.success) {
        setError(result.errors?._form?.[0] ?? "Could not record payment.");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function handlePublish() {
    if (!window.confirm("Publish this manuscript? It will become publicly visible.")) return;
    setError(null);
    setPending(true);
    try {
      const result = await publishManuscriptAction(row.id);
      if (!result.success) {
        setError(result.errors?._form?.[0] ?? "Could not publish this manuscript.");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {(row.status === "SUBMITTED" || row.status === "UNDER_REVIEW" || row.status === "RESUBMITTED" || row.status === "REVISION_REQUIRED") && (
        <Button size="sm" variant="outline" render={<Link href={`/review/${row.id}`} />} nativeButton={false}>
          Review →
        </Button>
      )}
      {(row.status === "APPROVED" || row.status === "PAYMENT_PENDING") && (
        <Button size="sm" variant="outline" disabled={pending} onClick={handleMarkPaymentReceived}>
          {pending ? "Working…" : "Record Offline Payment"}
        </Button>
      )}
      {row.status === "PAYMENT_COMPLETED" && (
        <Button size="sm" disabled={pending} onClick={handlePublish}>
          {pending ? "Working…" : "Publish"}
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function ManuscriptWorkflowTable({ rows }: { rows: WorkflowRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-card px-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">No manuscripts currently in the workflow.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card text-left font-mono text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">Manuscript</th>
            <th className="px-3 py-2">Author</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Payment</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 align-top hover:bg-muted/20">
              <td className="px-3 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs text-muted-foreground">{row.manuscriptCode}</span>
                  <span className="font-medium text-foreground">{row.title || "Untitled manuscript"}</span>
                </div>
              </td>
              <td className="px-3 py-3">{row.primaryAuthorName}</td>
              <td className="px-3 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-3 py-3 text-xs text-muted-foreground">
                {row.latestPayment ? (
                  <div className="flex flex-col gap-0.5">
                    <span className={row.latestPayment.gateway === "manual" ? "text-amber-400" : "text-emerald-400"}>
                      {row.latestPayment.gateway === "manual" ? "Offline (manual)" : "Razorpay"} · {row.latestPayment.verifiedAt.toLocaleDateString("en-US")}
                    </span>
                    <span className="font-mono">{row.latestPayment.gatewayPaymentId ?? row.latestPayment.reference}</span>
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-3">
                <WorkflowRowActions row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
