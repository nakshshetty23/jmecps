"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getNextAllowedStates, isTerminalState, type Actor } from "@/lib/state-machine/manuscript";
import { finalizeSubmissionAction } from "@/lib/actions/finalize-submission";
import { transitionManuscriptAction } from "@/lib/actions/manuscript-transitions";
import type { ManuscriptStatus } from "@/generated/prisma/client";

// Matches the enum declaration order in prisma/schema.prisma, for the
// "SYS_STATUS_NN" numbering.
const STATUS_ORDER: ManuscriptStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "REVISION_REQUIRED",
  "RESUBMITTED",
  "APPROVED",
  "PAYMENT_PENDING",
  "PAYMENT_COMPLETED",
  "PUBLISHED",
  "REJECTED",
  "WITHDRAWN",
];

const HAPPY_PATH: { label: string; matches: ManuscriptStatus[] }[] = [
  { label: "Draft", matches: ["DRAFT"] },
  { label: "Submitted", matches: ["SUBMITTED"] },
  { label: "Under Review", matches: ["UNDER_REVIEW", "REVISION_REQUIRED", "RESUBMITTED"] },
  { label: "Decision", matches: ["APPROVED"] },
  { label: "Payment", matches: ["PAYMENT_PENDING", "PAYMENT_COMPLETED"] },
  { label: "Published", matches: ["PUBLISHED"] },
];

const ACTION_LABELS: Partial<Record<ManuscriptStatus, string>> = {
  SUBMITTED: "Finalize & Submit",
  WITHDRAWN: "Withdraw",
  RESUBMITTED: "Resubmit",
  UNDER_REVIEW: "Move to Under Review",
  REVISION_REQUIRED: "Request Revision",
  APPROVED: "Approve",
  REJECTED: "Reject",
  PUBLISHED: "Publish",
  PAYMENT_PENDING: "Mark Payment Pending",
  PAYMENT_COMPLETED: "Mark Payment Completed",
};

const CONFIRM_COPY: Partial<Record<ManuscriptStatus, string>> = {
  SUBMITTED: "Once submitted, this manuscript can no longer be edited. Submit for review?",
  WITHDRAWN: "Withdrawing this manuscript ends its review process permanently. Continue?",
  REJECTED: "This will reject the manuscript and end its lifecycle. Continue?",
};

interface ManuscriptStatusTrackerProps {
  manuscriptId: string;
  status: ManuscriptStatus;
  role: Actor;
  isOwner: boolean;
}

export default function ManuscriptStatusTracker({ manuscriptId, status, role, isOwner }: ManuscriptStatusTrackerProps) {
  const router = useRouter();
  const [pendingTarget, setPendingTarget] = useState<ManuscriptStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nextStates = getNextAllowedStates(status, role).filter(() => {
    // Only the owning author gets author-scoped buttons rendered at all —
    // a co-author viewing someone else's manuscript shouldn't see actions
    // that would just fail server-side with an authorization error.
    if (role === "RESEARCHER") return isOwner;
    return true;
  });

  const statusIndex = STATUS_ORDER.indexOf(status);
  const currentStepIndex = HAPPY_PATH.findIndex((step) => step.matches.includes(status));
  const terminal = isTerminalState(status);

  async function handleTransition(target: ManuscriptStatus) {
    const confirmMessage = CONFIRM_COPY[target];
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setError(null);
    setPendingTarget(target);
    try {
      const result =
        target === "SUBMITTED"
          ? await finalizeSubmissionAction({ manuscriptId })
          : await transitionManuscriptAction({ manuscriptId, targetStatus: target });

      if (!result.success) {
        setError(result.errors?._form?.[0] ?? "Could not update this manuscript's status.");
        return;
      }
      router.refresh();
    } finally {
      setPendingTarget(null);
    }
  }

  return (
    <Card className="card-terminal">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="heading-display text-lg text-primary">Lifecycle Status</CardTitle>
          <Badge variant="outline" className="font-mono text-[0.7rem] border-accent/40 text-accent bg-accent/10">
            SYS_STATUS_{String(statusIndex + 1).padStart(2, "0")}: {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {terminal ? (
          <div
            className={`rounded-md border px-3 py-2 text-sm ${
              status === "PUBLISHED"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/40 bg-amber-500/10 text-amber-400"
            }`}
          >
            {status === "PUBLISHED" && "This manuscript has been published. Its lifecycle is complete."}
            {status === "REJECTED" && "This manuscript was rejected. Its lifecycle has ended."}
            {status === "WITHDRAWN" && "This manuscript was withdrawn by its author. Its lifecycle has ended."}
          </div>
        ) : (
          <div className="flex items-center">
            {HAPPY_PATH.map((step, index) => {
              const isDone = index < currentStepIndex;
              const isActive = index === currentStepIndex;
              return (
                <div key={step.label} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs ${
                        isActive
                          ? "border-accent bg-accent/20 text-accent"
                          : isDone
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`text-center text-xs ${
                        isActive ? "text-accent" : isDone ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < HAPPY_PATH.length - 1 && (
                    <div className={`mx-1 h-px flex-1 ${isDone ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {nextStates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {nextStates.map((target) => (
              <Button
                key={target}
                type="button"
                size="sm"
                variant={target === "REJECTED" || target === "WITHDRAWN" ? "destructive" : "outline"}
                disabled={pendingTarget !== null}
                onClick={() => handleTransition(target)}
              >
                {pendingTarget === target ? "Working…" : (ACTION_LABELS[target] ?? target)}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
