"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SUBJECT_CATEGORIES, SUBJECT_CATEGORY_LABELS } from "@/lib/validations/submission";

export default function TriageFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={searchParams.get("category") ?? "all"}
        onChange={(e) => updateParam("category", e.target.value)}
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
        value={searchParams.get("track") ?? "all"}
        onChange={(e) => updateParam("track", e.target.value)}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
      >
        <option value="all">All Tracks</option>
        <option value="STANDARD">Standard</option>
        <option value="SIT_CONF">SIT Conference</option>
      </select>

      <select
        value={searchParams.get("status") ?? "all"}
        onChange={(e) => updateParam("status", e.target.value)}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
      >
        <option value="all">All Review Statuses</option>
        <option value="SUBMITTED">Unassigned</option>
        <option value="UNDER_REVIEW">In Review</option>
        <option value="RESUBMITTED">Revision Pending</option>
      </select>

      <input
        type="search"
        defaultValue={searchParams.get("search") ?? ""}
        placeholder="Search by title…"
        onKeyDown={(e) => {
          if (e.key === "Enter") updateParam("search", e.currentTarget.value);
        }}
        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
      />
    </div>
  );
}
