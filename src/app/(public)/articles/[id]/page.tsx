import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getPublishedManuscriptDetail } from "@/lib/search/manuscripts";
import { SUBJECT_CATEGORY_LABELS, type SUBJECT_CATEGORIES } from "@/lib/validations/submission";

// Page-level ISR to match the data layer's caching (getPublishedManuscriptDetail
// in src/lib/search/manuscripts.ts) — a 1-hour safety-net revalidation, with
// on-demand invalidation via updateTag(`article-${id}`) whenever a manuscript's
// PUBLISHED status changes (see onManuscriptPublished in that same module).
// No generateStaticParams: articles are created continuously post-launch, so
// there's no fixed id list to pre-render at build time — dynamicParams (the
// default) lets Next.js render+cache each one on its first request instead.
export const revalidate = 3600;

// Google Scholar / Highwire Press citation meta tags — no real DOI exists in
// this build (no registrar integration), so citation_doi is intentionally
// omitted rather than fabricated. Everything else here is real data.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await getPublishedManuscriptDetail(id);
  if (!article) return { title: "Article not found | JMECPS" };

  return {
    title: `${article.title} | JMECPS`,
    description: article.abstract.slice(0, 200),
    other: {
      citation_title: article.title,
      citation_author: article.authors.map((a) => a.fullName),
      citation_publication_date: article.publishedAt.toISOString().slice(0, 10).replace(/-/g, "/"),
      citation_journal_title: "Journal of Mechanical, Electronics and Cyber Physical Systems",
      citation_abstract: article.abstract,
      citation_keywords: article.keywords.join("; "),
    },
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getPublishedManuscriptDetail(id);

  if (!article) {
    notFound();
  }

  const categoryLabel =
    SUBJECT_CATEGORY_LABELS[article.category as (typeof SUBJECT_CATEGORIES)[number]] ?? article.category;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{article.manuscriptCode}</span>
        <Badge
          variant="outline"
          className={
            article.track === "SIT_CONF"
              ? "font-mono text-[0.7rem] border-accent/40 text-accent bg-accent/10"
              : "font-mono text-[0.7rem] border-primary/40 text-primary bg-primary/10"
          }
        >
          {article.track === "SIT_CONF" ? "SIT_CONF" : "STANDARD"}
        </Badge>
        <Badge variant="outline" className="text-[0.7rem] border-border text-muted-foreground">
          {categoryLabel}
        </Badge>
      </div>

      <h1 className="heading-display text-3xl text-foreground">{article.title}</h1>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {article.authors.map((author, i) => (
          <span key={i}>
            {author.fullName}
            {author.institution && <span className="text-xs"> — {author.institution}</span>}
          </span>
        ))}
      </div>

      <p className="font-mono text-xs text-muted-foreground">
        Published{" "}
        {article.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abstract</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">{article.abstract}</p>
        </CardContent>
      </Card>

      {article.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {article.keywords.map((kw) => (
            <span key={kw} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
              {kw}
            </span>
          ))}
        </div>
      )}

      {article.references.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">References</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2 list-decimal list-inside text-sm text-muted-foreground">
              {article.references.map((ref, i) => (
                <li key={i}>{ref}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
