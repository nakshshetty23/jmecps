import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SUBJECT_CATEGORY_LABELS, type SUBJECT_CATEGORIES } from "@/lib/validations/submission";
import type { SearchResultRow } from "@/lib/search/manuscripts";

const ABSTRACT_SNIPPET_LENGTH = 240;

export default function SearchResultCard({ result }: { result: SearchResultRow }) {
  const categoryLabel =
    SUBJECT_CATEGORY_LABELS[result.category as (typeof SUBJECT_CATEGORIES)[number]] ?? result.category;
  const isTruncated = result.abstract.length > ABSTRACT_SNIPPET_LENGTH;
  const snippet = isTruncated ? `${result.abstract.slice(0, ABSTRACT_SNIPPET_LENGTH).trim()}…` : result.abstract;

  return (
    <article className="card-terminal flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{result.manuscriptCode}</span>
        <Badge
          variant="outline"
          className={
            result.track === "SIT_CONF"
              ? "font-mono text-[0.7rem] border-accent/40 text-accent bg-accent/10"
              : "font-mono text-[0.7rem] border-primary/40 text-primary bg-primary/10"
          }
        >
          {result.track === "SIT_CONF" ? "SIT_CONF" : "STANDARD"}
        </Badge>
        <Badge variant="outline" className="text-[0.7rem] border-border text-muted-foreground">
          {categoryLabel}
        </Badge>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {result.publishedAt
            ? result.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
            : "Date unavailable"}
        </span>
      </div>

      <Link href={`/articles/${result.id}`} className="heading-display text-lg text-foreground hover:text-primary">
        {result.title || "Untitled manuscript"}
      </Link>

      {result.authors.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {result.authors.map((author, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {author.fullName}
              {author.institution && (
                <Badge variant="outline" className="text-[0.65rem] border-border text-muted-foreground">
                  {author.institution}
                </Badge>
              )}
            </span>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {snippet}
        {isTruncated && (
          <Link href={`/articles/${result.id}`} className="ml-1 text-primary hover:underline">
            Read more
          </Link>
        )}
      </p>

      {result.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.keywords.map((kw) => (
            <span key={kw} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {kw}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
