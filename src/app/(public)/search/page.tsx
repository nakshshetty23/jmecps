import type { Metadata } from "next";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import SearchFilters from "@/components/search/SearchFilters";
import SearchResultCard from "@/components/search/SearchResultCard";
import PaginationControls from "@/components/editor/PaginationControls";
import { searchPublishedManuscripts } from "@/lib/search/manuscripts";

export const metadata: Metadata = {
  title: "Search Published Papers | JMECPS",
  description:
    "Search published manuscripts in the Journal of Mechanical, Electronics and Cyber Physical Systems by title, abstract, author, or subject area.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const year = params.year ? parseInt(params.year, 10) : undefined;

  const results = await searchPublishedManuscripts({
    query: params.q ?? "",
    category: params.category,
    track: params.track as "SIT_CONF" | "STANDARD" | undefined,
    year: Number.isFinite(year) ? year : undefined,
    sort: (params.sort as "relevance" | "newest" | "oldest" | undefined) ?? "relevance",
    page,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-6">
      <div>
        <h1 className="heading-display text-3xl text-primary">Search Published Papers</h1>
        <p className="mt-1 text-muted-foreground">
          Browse the JMECPS archive of peer-reviewed, published manuscripts.
        </p>
      </div>

      <SearchFilters />

      {results.rows.length === 0 ? (
        <Card className="card-terminal">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              {params.q ? "No published papers match this search." : "No published papers yet."}
            </CardTitle>
            <CardDescription>Try a different query or clear the filters above.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {results.totalCount} published paper{results.totalCount === 1 ? "" : "s"} found.
          </p>
          <div className="flex flex-col gap-4">
            {results.rows.map((result) => (
              <SearchResultCard key={result.id} result={result} />
            ))}
          </div>
          <PaginationControls page={results.page} totalPages={results.totalPages} searchParams={params} basePath="/search" />
        </>
      )}
    </div>
  );
}
