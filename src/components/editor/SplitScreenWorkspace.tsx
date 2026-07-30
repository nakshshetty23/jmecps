"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  saveEditorialNotesAction,
  submitEditorialDecisionAction,
  releaseReviewLockAction,
} from "@/lib/actions/editorial";
import type { ManuscriptStatus, EditorialDecision } from "@/generated/prisma/client";

const RUBRIC_CRITERIA: { key: string; label: string }[] = [
  { key: "originality", label: "Originality" },
  { key: "methodology", label: "Methodology" },
  { key: "clarity", label: "Clarity" },
  { key: "technicalRigor", label: "Technical Rigor" },
];

const AUTOSAVE_DEBOUNCE_MS = 1500;

interface SplitScreenWorkspaceProps {
  manuscriptId: string;
  manuscriptCode: string;
  title: string;
  abstract: string;
  keywords: string[];
  references: string[];
  fileUrl: string | null;
  status: ManuscriptStatus;
  primaryAuthor: { fullName: string; email: string } | null;
  initialDraft: { internalNotes: string; authorNotes: string; rubricScores: Record<string, number> } | null;
  lockedBySomeoneElse: boolean;
  lockHolderName: string | null;
}

export default function SplitScreenWorkspace({
  manuscriptId,
  manuscriptCode,
  title,
  abstract,
  keywords,
  references,
  fileUrl,
  status,
  primaryAuthor,
  initialDraft,
  lockedBySomeoneElse,
  lockHolderName,
}: SplitScreenWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"internal" | "author">("internal");
  const [showMetadata, setShowMetadata] = useState(false);
  const [internalNotes, setInternalNotes] = useState(initialDraft?.internalNotes ?? "");
  const [authorNotes, setAuthorNotes] = useState(initialDraft?.authorNotes ?? "");
  const [rubricScores, setRubricScores] = useState<Record<string, number>>(initialDraft?.rubricScores ?? {});
  const [revisionDeadline, setRevisionDeadline] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [decisionInFlight, setDecisionInFlight] = useState<EditorialDecision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLocked = lockedBySomeoneElse;
  const canDecide = ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"].includes(status);

  useEffect(() => {
    if (isLocked) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setSaveState("saving");
    autosaveTimer.current = setTimeout(async () => {
      await saveEditorialNotesAction({ manuscriptId, internalNotes, authorNotes, rubricScores });
      setSaveState("saved");
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalNotes, authorNotes, rubricScores, isLocked, manuscriptId]);

  useEffect(() => {
    return () => {
      if (!isLocked) releaseReviewLockAction({ manuscriptId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manuscriptId]);

  function setRubricScore(key: string, score: number) {
    setRubricScores((prev) => ({ ...prev, [key]: score }));
  }

  async function handleDecision(decision: EditorialDecision) {
    const confirmCopy: Record<EditorialDecision, string> = {
      APPROVED: "Approve this manuscript?",
      REJECTED: "Reject this manuscript? This ends its lifecycle.",
      REVISION_REQUIRED: "Send this manuscript back to the author for revisions?",
    };
    if (!window.confirm(confirmCopy[decision])) return;

    setError(null);
    setDecisionInFlight(decision);
    try {
      const result = await submitEditorialDecisionAction({
        manuscriptId,
        decision,
        reviewNotes: authorNotes,
        internalNotes,
        rubricScores,
        revisionDeadline: decision === "REVISION_REQUIRED" && revisionDeadline ? revisionDeadline : null,
      });
      if (!result.success) {
        setError(result.errors?._form?.[0] ?? "Could not submit this decision.");
        return;
      }
      router.push("/review");
      router.refresh();
    } finally {
      setDecisionInFlight(null);
    }
  }

  const isPdf = fileUrl?.toLowerCase().endsWith(".pdf");
  const isDownloadable = Boolean(fileUrl && fileUrl.startsWith("http"));

  return (
    <div className="flex flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-mono text-xs text-muted-foreground">{manuscriptCode}</span>
          <h1 className="heading-display text-xl text-primary">{title || "Untitled manuscript"}</h1>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {status.replace(/_/g, " ")}
        </Badge>
      </div>

      {isLocked && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
          {lockHolderName ?? "Another editor"} is currently reviewing this paper. You're in read-only preview mode.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left pane: manuscript viewer */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Manuscript Viewer</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowMetadata((v) => !v)}>
              {showMetadata ? "Hide Metadata" : "Show Metadata"}
            </Button>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {showMetadata && (
              <div className="flex flex-col gap-3 rounded-md border border-border p-3 text-sm">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Abstract</p>
                  <p className="mt-1">{abstract || "—"}</p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    Primary Author
                  </p>
                  <p className="mt-1">{primaryAuthor ? `${primaryAuthor.fullName} (${primaryAuthor.email})` : "—"}</p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Keywords</p>
                  <p className="mt-1">{keywords.join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">References</p>
                  <ol className="mt-1 list-decimal list-inside">
                    {references.length > 0 ? references.map((r, i) => <li key={i}>{r}</li>) : "—"}
                  </ol>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    SHA-256 Fingerprint
                  </p>
                  <p className="mt-1 font-mono text-xs">{fileUrl ? "On file, verified at upload time" : "No file attached"}</p>
                </div>
              </div>
            )}

            <div className="flex min-h-100 flex-1 items-center justify-center rounded-md border border-border bg-background">
              {isPdf && isDownloadable ? (
                <iframe src={fileUrl!} title="Manuscript document" className="h-full min-h-100 w-full rounded-md" />
              ) : fileUrl ? (
                <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
                  <p>
                    {isDownloadable
                      ? "This file type can't be previewed inline."
                      : "File attached, but no direct preview URL is configured for this storage bucket."}
                  </p>
                  {isDownloadable && (
                    <a href={fileUrl!} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      Open file in a new tab
                    </a>
                  )}
                </div>
              ) : (
                <p className="p-6 text-sm text-muted-foreground">No file attached to this manuscript.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right pane: editorial comment & decision panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Editorial Decision</CardTitle>
          </CardHeader>
          <CardContent>
            <fieldset disabled={isLocked} className="flex flex-col gap-4">
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={activeTab === "internal" ? "default" : "outline"}
                  onClick={() => setActiveTab("internal")}
                >
                  Internal Editor Notes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={activeTab === "author" ? "default" : "outline"}
                  onClick={() => setActiveTab("author")}
                >
                  Author Feedback
                </Button>
              </div>

              {activeTab === "internal" ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">
                    Visible only to editorial staff — never sent to the author.
                  </label>
                  <textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={6}
                    className="w-full rounded-md border border-input bg-transparent p-2.5 text-sm outline-none focus-visible:border-ring"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Sent to the corresponding author with your decision.</label>
                  <textarea
                    value={authorNotes}
                    onChange={(e) => setAuthorNotes(e.target.value)}
                    rows={6}
                    className="w-full rounded-md border border-input bg-transparent p-2.5 text-sm outline-none focus-visible:border-ring"
                  />
                </div>
              )}

              <span className="text-xs text-muted-foreground">
                {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Draft saved" : ""}
              </span>

              <div className="flex flex-col gap-2">
                <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">Evaluation Rubric</p>
                {RUBRIC_CRITERIA.map((criterion) => (
                  <div key={criterion.key} className="flex items-center justify-between gap-2">
                    <span className="text-sm">{criterion.label}</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setRubricScore(criterion.key, score)}
                          className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                            rubricScores[criterion.key] === score
                              ? "border-primary bg-primary/20 text-primary"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="revision-deadline" className="text-xs text-muted-foreground">
                  Revision deadline (optional, used only with "Request Revision")
                </label>
                <input
                  id="revision-deadline"
                  type="date"
                  value={revisionDeadline}
                  onChange={(e) => setRevisionDeadline(e.target.value)}
                  className="h-8 w-fit rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
                />
              </div>

              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {!canDecide && (
                <p className="text-sm text-muted-foreground">
                  This manuscript is not currently awaiting an editorial decision.
                </p>
              )}

              {canDecide && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={decisionInFlight !== null}
                    onClick={() => handleDecision("APPROVED")}
                    className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                  >
                    {decisionInFlight === "APPROVED" ? "Working…" : "Approve Manuscript"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={decisionInFlight !== null}
                    onClick={() => handleDecision("REVISION_REQUIRED")}
                  >
                    {decisionInFlight === "REVISION_REQUIRED" ? "Working…" : "Request Revision"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={decisionInFlight !== null}
                    onClick={() => handleDecision("REJECTED")}
                  >
                    {decisionInFlight === "REJECTED" ? "Working…" : "Reject Manuscript"}
                  </Button>
                </div>
              )}
            </fieldset>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
