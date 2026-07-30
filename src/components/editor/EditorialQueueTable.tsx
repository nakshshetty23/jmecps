"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SUBJECT_CATEGORIES, SUBJECT_CATEGORY_LABELS } from "@/lib/validations/submission";
import type { QueueRow } from "@/lib/actions/editorial";

type ReviewStatusFilter = "all" | "unassigned" | "in-review" | "revision-pending";
type TrackFilter = "all" | "SIT_CONF" | "STANDARD";

function reviewStatusOf(row: QueueRow): ReviewStatusFilter {
  if (row.status === "RESUBMITTED") return "revision-pending";
  if (row.status === "UNDER_REVIEW") return "in-review";
  return "unassigned";
}

function pendingLabel(row: QueueRow): string {
  if (row.daysPending >= 1) return `${row.daysPending} day${row.daysPending === 1 ? "" : "s"} pending`;
  return `${row.hoursPending} hour${row.hoursPending === 1 ? "" : "s"} pending`;
}

function pendingUrgencyClass(row: QueueRow): string {
  if (row.daysPending >= 3) return "border-amber-500/40 text-amber-400 bg-amber-500/10";
  if (row.daysPending >= 1) return "border-accent/40 text-accent bg-accent/10";
  return "border-border text-muted-foreground";
}

export default function EditorialQueueTable({ rows }: { rows: QueueRow[] }) {
  const [category, setCategory] = useState<string>("all");
  const [track, setTrack] = useState<TrackFilter>("all");
  const [reviewStatus, setReviewStatus] = useState<ReviewStatusFilter>("all");

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (category !== "all" && row.subject_category !== category) return false;
      if (track !== "all" && (row.sit_conference_flag ? "SIT_CONF" : "STANDARD") !== track) return false;
      if (reviewStatus !== "all" && reviewStatusOf(row) !== reviewStatus) return false;
      return true;
    });
  }, [rows, category, track, reviewStatus]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
        >
          <option value="all">All Journal Sections</option>
          {SUBJECT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {SUBJECT_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>

        <select
          value={track}
          onChange={(e) => setTrack(e.target.value as TrackFilter)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
        >
          <option value="all">All Tracks</option>
          <option value="STANDARD">Standard</option>
          <option value="SIT_CONF">SIT Conference</option>
        </select>

        <div className="flex gap-1.5">
          {(["all", "unassigned", "in-review", "revision-pending"] as ReviewStatusFilter[]).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={reviewStatus === value ? "default" : "outline"}
              onClick={() => setReviewStatus(value)}
            >
              {value === "all"
                ? "All"
                : value === "unassigned"
                  ? "Unassigned"
                  : value === "in-review"
                    ? "In Review"
                    : "Revision Pending"}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-border bg-card px-3 py-6 text-center text-sm text-muted-foreground">
          No manuscripts match this view.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-left font-mono text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Manuscript</th>
                <th className="px-3 py-2">Primary Author</th>
                <th className="px-3 py-2">Track</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Pending</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs text-muted-foreground">{row.manuscriptCode}</span>
                      <span className="font-medium text-foreground">{row.title || "Untitled manuscript"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <span>{row.primaryAuthorName}</span>
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
                    <Badge
                      variant="outline"
                      className={
                        row.sit_conference_flag
                          ? "font-mono text-[0.7rem] border-accent/40 text-accent bg-accent/10"
                          : "font-mono text-[0.7rem] border-primary/40 text-primary bg-primary/10"
                      }
                    >
                      {row.sit_conference_flag ? "SIT_CONF" : "STANDARD"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className="font-mono text-[0.7rem]">
                      {row.status.replace(/_/g, " ")}
                    </Badge>
                    {row.lockedByActive && (
                      <p className="mt-1 text-[0.7rem] text-muted-foreground">Being reviewed</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="outline" className={`text-[0.7rem] ${pendingUrgencyClass(row)}`}>
                      {pendingLabel(row)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Button size="sm" variant="outline" render={<Link href={`/review/${row.id}`} />} nativeButton={false}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
