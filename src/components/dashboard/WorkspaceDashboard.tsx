"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SUBJECT_CATEGORY_LABELS, type SUBJECT_CATEGORIES } from "@/lib/validations/submission";
import { getManuscriptCode } from "@/lib/manuscript-code";
import type { Manuscript, ManuscriptStatus, Payment } from "@/generated/prisma/client";

interface Row extends Manuscript {
  relationship: "own" | "co-author";
}

interface WorkspaceDashboardProps {
  email: string;
  own: Manuscript[];
  coAuthored: Manuscript[];
  paymentsByManuscriptId: Record<string, Payment>;
}

type Scope = "all" | "mine" | "co-authored" | "drafts";
type StatusFilter = "all" | "under-review" | "accepted" | "rejected" | "withdrawn" | "sit-track";
type SidebarView = "matrix" | "reviews" | "review-history" | "preferences" | "orcid" | "notifications" | "settings";

const UNDER_REVIEW_STATUSES: ManuscriptStatus[] = ["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUIRED", "RESUBMITTED"];
const ACCEPTED_STATUSES: ManuscriptStatus[] = ["APPROVED", "PAYMENT_PENDING", "PAYMENT_COMPLETED", "PUBLISHED"];

const STATUS_STYLES: Record<ManuscriptStatus, string> = {
  DRAFT: "border-border text-muted-foreground bg-transparent",
  SUBMITTED: "border-accent/40 text-accent bg-accent/10",
  UNDER_REVIEW: "border-accent/40 text-accent bg-accent/10",
  REVISION_REQUIRED: "border-accent/40 text-accent bg-accent/10",
  RESUBMITTED: "border-accent/40 text-accent bg-accent/10",
  APPROVED: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  PAYMENT_PENDING: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  PAYMENT_COMPLETED: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  PUBLISHED: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  REJECTED: "border-amber-500/40 text-amber-400 bg-amber-500/10",
  WITHDRAWN: "border-amber-500/40 text-amber-400 bg-amber-500/10",
};

function StatusPill({ status }: { status: ManuscriptStatus }) {
  return (
    <Badge
      variant="outline"
      className={`font-mono text-[0.7rem] uppercase tracking-wide ${STATUS_STYLES[status]}`}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function TrackBadge({ isSIT }: { isSIT: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isSIT
          ? "font-mono text-[0.7rem] border-accent/40 text-accent bg-accent/10"
          : "font-mono text-[0.7rem] border-primary/40 text-primary bg-primary/10"
      }
    >
      {isSIT ? "SIT_CONF" : "STANDARD"}
    </Badge>
  );
}

function OrcidBadge({ manuscript }: { manuscript: Manuscript }) {
  const authors = Array.isArray(manuscript.co_authors)
    ? (manuscript.co_authors as { isCorresponding?: boolean; orcid?: string }[])
    : [];
  const correspondingAuthor = authors.find((a) => a.isCorresponding) ?? authors[0];
  const hasOrcid = Boolean(correspondingAuthor?.orcid);

  return hasOrcid ? (
    <Badge variant="outline" className="text-[0.7rem] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
      ORCID Verified
    </Badge>
  ) : (
    <Badge variant="outline" className="text-[0.7rem] border-border text-muted-foreground">
      No ORCID on file
    </Badge>
  );
}

// No payment gateway is wired up in this build (that's a separate,
// deliberate infrastructure decision — same class as the R2/SES choices
// made earlier — not something to silently fake here). "Pay Now" and
// "Complete Payment" surface an honest notice instead of a broken checkout.
function ApcBadge({ manuscript, payment }: { manuscript: Manuscript; payment: Payment | undefined }) {
  const [showNotice, setShowNotice] = useState(false);

  if (manuscript.status === "PAYMENT_PENDING") {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[0.7rem] border-amber-500/40 text-amber-400 bg-amber-500/10">
            Payment Pending
          </Badge>
          <Button size="sm" variant="outline" onClick={() => setShowNotice((v) => !v)}>
            Pay Now
          </Button>
        </div>
        {showNotice && (
          <p className="text-xs text-muted-foreground">Payment processing isn't configured for this deployment yet.</p>
        )}
      </div>
    );
  }

  if (manuscript.status === "PAYMENT_COMPLETED" || (manuscript.status === "PUBLISHED" && payment?.status === "COMPLETED")) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[0.7rem] border-accent/40 text-accent bg-accent/10">
          Payment Completed
        </Badge>
        {payment?.invoice_url ? (
          <a href={payment.invoice_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
            Download Invoice
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">Invoice not available</span>
        )}
      </div>
    );
  }

  if (manuscript.status === "PUBLISHED" && !payment) {
    return (
      <Badge variant="outline" className="text-[0.7rem] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
        Waiver Approved
      </Badge>
    );
  }

  return null;
}

const QUICK_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "under-review", label: "Under Review" },
  { value: "accepted", label: "Accepted / Published" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "sit-track", label: "SIT Track" },
];

const SUBMISSIONS_GROUP: { label: string; scope?: Scope; href?: string }[] = [
  { label: "Overview", scope: "all" },
  { label: "Submit New Manuscript", href: "/submissions/new" },
  { label: "My Submissions", scope: "mine" },
  { label: "Co-Authored Manuscripts", scope: "co-authored" },
  { label: "Drafts", scope: "drafts" },
];

const REVIEWER_GROUP: { label: string; view: SidebarView }[] = [
  { label: "Assigned Reviews", view: "reviews" },
  { label: "Review History", view: "review-history" },
  { label: "Peer Review Preferences", view: "preferences" },
];

const SYSTEM_GROUP: { label: string; view: SidebarView }[] = [
  { label: "ORCID Integration", view: "orcid" },
  { label: "Notifications Log", view: "notifications" },
  { label: "Settings", view: "settings" },
];

const COMING_SOON_COPY: Record<Exclude<SidebarView, "matrix">, { title: string; description: string }> = {
  reviews: {
    title: "Assigned Reviews",
    description:
      "Peer review assignment isn't part of this build yet — there's no reviewer-assignment model behind it.",
  },
  "review-history": {
    title: "Review History",
    description: "Will show your completed peer reviews once the reviewer-assignment workflow exists.",
  },
  preferences: {
    title: "Peer Review Preferences",
    description: "Subject-area opt-ins for peer review invitations — coming with the reviewer workflow.",
  },
  orcid: {
    title: "ORCID Integration",
    description:
      "Account-level ORCID OAuth linking isn't wired up yet. Corresponding-author ORCID IDs entered on a manuscript's author list are shown per-submission in the matrix below.",
  },
  notifications: {
    title: "Notifications Log",
    description: "A history of submission-status emails sent to you — not yet persisted anywhere queryable.",
  },
  settings: {
    title: "Settings",
    description: "Account settings (name, institution, password) — coming in a later session.",
  },
};

export default function WorkspaceDashboard({ email, own, coAuthored, paymentsByManuscriptId }: WorkspaceDashboardProps) {
  const [sidebarView, setSidebarView] = useState<SidebarView>("matrix");
  const [scope, setScope] = useState<Scope>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const metrics = useMemo(
    () => ({
      total: own.length,
      activeInReview: own.filter((m) => UNDER_REVIEW_STATUSES.includes(m.status)).length,
      revisionsRequested: own.filter((m) => m.status === "REVISION_REQUIRED").length,
      published: own.filter((m) => m.status === "PUBLISHED").length,
    }),
    [own]
  );

  const allRows: Row[] = useMemo(
    () => [
      ...own.map((m) => ({ ...m, relationship: "own" as const })),
      ...coAuthored.map((m) => ({ ...m, relationship: "co-author" as const })),
    ],
    [own, coAuthored]
  );

  const scopedRows = useMemo(() => {
    switch (scope) {
      case "mine":
        return allRows.filter((r) => r.relationship === "own");
      case "co-authored":
        return allRows.filter((r) => r.relationship === "co-author");
      case "drafts":
        return allRows.filter((r) => r.relationship === "own" && r.status === "DRAFT");
      default:
        return allRows;
    }
  }, [allRows, scope]);

  const rows = useMemo(() => {
    switch (statusFilter) {
      case "under-review":
        return scopedRows.filter((r) => UNDER_REVIEW_STATUSES.includes(r.status));
      case "accepted":
        return scopedRows.filter((r) => ACCEPTED_STATUSES.includes(r.status));
      case "rejected":
        return scopedRows.filter((r) => r.status === "REJECTED");
      case "withdrawn":
        return scopedRows.filter((r) => r.status === "WITHDRAWN");
      case "sit-track":
        return scopedRows.filter((r) => r.sit_conference_flag);
      default:
        return scopedRows;
    }
  }, [scopedRows, statusFilter]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b border-border bg-card px-4 py-6 lg:w-64 lg:border-b-0 lg:border-r">
        <div className="mb-6 flex flex-col gap-1.5">
          <span className="heading-display text-lg text-primary">Workspace</span>
          <Badge variant="outline" className="w-fit max-w-full truncate border-border text-muted-foreground">
            {email || "Unknown account"}
          </Badge>
        </div>

        <nav className="flex flex-col gap-6 text-sm">
          <div>
            <p className="subheading-mono mb-2 text-xs">Submissions</p>
            <div className="flex flex-col gap-0.5">
              {SUBMISSIONS_GROUP.map((item) =>
                item.href ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-md px-2 py-1.5 text-foreground hover:bg-muted/40 hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setSidebarView("matrix");
                      setScope(item.scope!);
                    }}
                    className={`rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/40 hover:text-primary ${
                      sidebarView === "matrix" && scope === item.scope
                        ? "bg-muted/40 text-primary"
                        : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <p className="subheading-mono mb-2 text-xs">Reviewer Workspace</p>
            <div className="flex flex-col gap-0.5">
              {REVIEWER_GROUP.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => setSidebarView(item.view)}
                  className={`rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/40 hover:text-primary ${
                    sidebarView === item.view ? "bg-muted/40 text-primary" : "text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="subheading-mono mb-2 text-xs">System &amp; Account</p>
            <div className="flex flex-col gap-0.5">
              {SYSTEM_GROUP.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => setSidebarView(item.view)}
                  className={`rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/40 hover:text-primary ${
                    sidebarView === item.view ? "bg-muted/40 text-primary" : "text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {sidebarView !== "matrix" ? (
          <Card className="card-terminal max-w-2xl">
            <CardHeader>
              <CardTitle className="heading-display text-xl text-primary">
                {COMING_SOON_COPY[sidebarView].title}
              </CardTitle>
              <CardDescription>{COMING_SOON_COPY[sidebarView].description}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Submissions", value: metrics.total },
                { label: "Active in Review", value: metrics.activeInReview },
                { label: "Revisions Requested", value: metrics.revisionsRequested },
                { label: "Published Papers", value: metrics.published },
              ].map((metric) => (
                <div key={metric.label} className="card-terminal flex flex-col gap-1">
                  <span className="font-mono text-2xl text-primary">{metric.value}</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</span>
                </div>
              ))}
            </div>

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {QUICK_FILTERS.map((filter) => (
                  <Button
                    key={filter.value}
                    type="button"
                    size="sm"
                    variant={statusFilter === filter.value ? "default" : "outline"}
                    onClick={() => setStatusFilter(filter.value)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
              <Button render={<Link href="/submissions/new" />} nativeButton={false}>
                + New Manuscript Submission
              </Button>
            </div>

            {rows.length === 0 ? (
              <Card className="card-terminal">
                <CardHeader>
                  <CardTitle className="text-base text-muted-foreground">No manuscripts match this view.</CardTitle>
                </CardHeader>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {rows.map((row) => {
                  const code = getManuscriptCode(row.id, row.created_at);
                  const isExpanded = expandedId === row.id;
                  const isDownloadable = Boolean(row.file_url && row.file_url.startsWith("http"));
                  const categoryLabel =
                    SUBJECT_CATEGORY_LABELS[row.subject_category as (typeof SUBJECT_CATEGORIES)[number]] ??
                    row.subject_category ??
                    "Uncategorized";

                  return (
                    <div key={row.id} className="card-terminal flex flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{code}</span>
                        <TrackBadge isSIT={row.sit_conference_flag} />
                        {row.relationship === "co-author" && (
                          <Badge variant="outline" className="text-[0.7rem] border-border text-muted-foreground">
                            Co-Author
                          </Badge>
                        )}
                        <span className="ml-auto">
                          <StatusPill status={row.status} />
                        </span>
                      </div>

                      <div className="flex flex-col gap-1">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{categoryLabel}</p>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                          className="text-left font-medium text-foreground hover:text-primary"
                        >
                          {row.title || "Untitled manuscript"}
                        </button>
                        {isExpanded && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {row.abstract || "No abstract yet."}
                          </p>
                        )}
                      </div>

                      {row.relationship === "own" && (
                        <ApcBadge manuscript={row} payment={paymentsByManuscriptId[row.id]} />
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <OrcidBadge manuscript={row} />
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono">
                            {/* Explicit locale — avoids a server/client hydration
                                mismatch when the browser's default locale differs
                                from the server's. */}
                            {row.created_at.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            render={<Link href={`/submissions/${row.id}`} />}
                            nativeButton={false}
                          >
                            {row.relationship === "own" && row.status === "DRAFT"
                              ? "Continue Draft"
                              : row.relationship === "own" && row.status === "REVISION_REQUIRED"
                                ? "Upload Revision"
                                : row.relationship === "own" && row.status === "PUBLISHED"
                                  ? "View Metadata / DOI"
                                  : "View Status"}
                          </Button>
                          {row.file_url &&
                            (isDownloadable ? (
                              <Button
                                size="sm"
                                variant="outline"
                                render={<a href={row.file_url} target="_blank" rel="noopener noreferrer" />}
                                nativeButton={false}
                              >
                                Download PDF
                              </Button>
                            ) : (
                              <span className="rounded-md border border-border px-2.5 py-1 text-muted-foreground">
                                File attached
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
