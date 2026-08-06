"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SUBJECT_CATEGORIES, SUBJECT_CATEGORY_LABELS } from "@/lib/validations/submission";

const DEBOUNCE_MS = 400;

export default function SearchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [queryInput, setQueryInput] = useState(searchParams.get("q") ?? "");

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  // Debounced query -> URL sync. Only fires when the input actually diverges
  // from the URL's current ?q= (avoids re-pushing on every render and avoids
  // fighting the user if they navigate back with a different query already set).
  useEffect(() => {
    const currentQ = searchParams.get("q") ?? "";
    if (queryInput === currentQ) return;
    const timer = setTimeout(() => updateParams({ q: queryInput || null }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryInput]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={queryInput}
        onChange={(e) => setQueryInput(e.target.value)}
        placeholder="Search published papers by title, abstract, or author…"
        className="h-11 w-full rounded-lg border border-input bg-transparent px-3.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />

      <div className="flex flex-wrap gap-3">
        <select
          value={searchParams.get("category") ?? "all"}
          onChange={(e) => updateParams({ category: e.target.value === "all" ? null : e.target.value })}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
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
          onChange={(e) => updateParams({ track: e.target.value === "all" ? null : e.target.value })}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
        >
          <option value="all">All Tracks</option>
          <option value="STANDARD">Standard</option>
          <option value="SIT_CONF">SIT Conference</option>
        </select>

        <input
          type="number"
          inputMode="numeric"
          placeholder="Year"
          defaultValue={searchParams.get("year") ?? ""}
          onBlur={(e) => updateParams({ year: e.target.value || null })}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateParams({ year: e.currentTarget.value || null });
          }}
          className="h-9 w-24 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
        />

        <select
          value={searchParams.get("sort") ?? "relevance"}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
        >
          <option value="relevance">Relevance</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>
    </div>
  );
}
