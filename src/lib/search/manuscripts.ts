import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getManuscriptCode } from "@/lib/manuscript-code";

// Full-text search over published manuscripts.
//
// There's no separate search index to keep in sync here — search_vector is a
// Postgres GENERATED STORED column (see the migration
// 20260805134415_manuscript_search_vector), recomputed by the database
// itself inside the same transaction as any INSERT/UPDATE on the row. That
// means the "indexing pipeline" this module might otherwise need (upsert on
// publish, retry-on-failure, a separate backfill script) doesn't apply: the
// generated column populated itself for every existing row the moment the
// migration ran, and it is structurally impossible for a manuscript's
// indexed content to drift from its actual content. onManuscriptPublished
// below exists as the integration seam if a real external engine
// (Elasticsearch/Algolia/etc.) is ever added later — today it's a no-op.

export interface AuthorSummary {
  fullName: string;
  institution: string;
}

export interface SearchResultRow {
  id: string;
  manuscriptCode: string;
  title: string;
  abstract: string;
  keywords: string[];
  category: string;
  track: "SIT_CONF" | "STANDARD";
  institution: string;
  correspondingAuthorName: string | null;
  authors: AuthorSummary[];
  publishedAt: Date;
  rank: number;
}

interface RawSearchRow {
  id: string;
  title: string;
  abstract: string;
  keywords: string[];
  subject_category: string;
  sit_conference_flag: boolean;
  institution: string;
  co_authors: unknown;
  created_at: Date;
  updated_at: Date;
  rank: number;
}

export interface SearchPage {
  rows: SearchResultRow[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

type RawAuthor = { isCorresponding?: boolean; firstName?: string; lastName?: string; institution?: string };

function parseAuthors(coAuthors: unknown): RawAuthor[] {
  return Array.isArray(coAuthors) ? (coAuthors as RawAuthor[]) : [];
}

function correspondingAuthorName(coAuthors: unknown): string | null {
  const authors = parseAuthors(coAuthors);
  const author = authors.find((a) => a.isCorresponding) ?? authors[0];
  if (!author) return null;
  const name = [author.firstName, author.lastName].filter(Boolean).join(" ");
  return name || null;
}

function authorSummaries(coAuthors: unknown): AuthorSummary[] {
  return parseAuthors(coAuthors).map((a) => ({
    fullName: [a.firstName, a.lastName].filter(Boolean).join(" ") || "Unknown",
    institution: a.institution ?? "",
  }));
}

const TRIGRAM_SIMILARITY_THRESHOLD = 0.15;

function toSearchPage(rows: RawSearchRow[], totalCount: number, page: number, limit: number): SearchPage {
  return {
    rows: rows.map((r) => ({
      id: r.id,
      manuscriptCode: getManuscriptCode(r.id, r.created_at),
      title: r.title,
      abstract: r.abstract,
      keywords: r.keywords,
      category: r.subject_category,
      track: r.sit_conference_flag ? "SIT_CONF" : "STANDARD",
      institution: r.institution,
      correspondingAuthorName: correspondingAuthorName(r.co_authors),
      authors: authorSummaries(r.co_authors),
      publishedAt: r.updated_at,
      rank: r.rank,
    })),
    totalCount,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
  };
}

type SortMode = "relevance" | "newest" | "oldest";

function orderClause(sort: SortMode, hasRank: boolean): Prisma.Sql {
  if (sort === "oldest") return Prisma.sql`ORDER BY updated_at ASC`;
  if (sort === "newest" || !hasRank) return Prisma.sql`ORDER BY updated_at DESC`;
  return Prisma.sql`ORDER BY rank DESC, updated_at DESC`;
}

async function runSearch(
  matchCondition: Prisma.Sql | null,
  rankExpr: Prisma.Sql | null,
  filters: Prisma.Sql[],
  page: number,
  limit: number,
  sort: SortMode
) {
  const where = Prisma.join(
    [Prisma.sql`status = 'PUBLISHED'::"ManuscriptStatus"`, ...(matchCondition ? [matchCondition] : []), ...filters],
    " AND "
  );

  const countResult = await db.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`SELECT count(*)::bigint as count FROM manuscripts WHERE ${where}`
  );
  const totalCount = Number(countResult[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const effectivePage = Math.min(page, totalPages);

  const rows = await db.$queryRaw<RawSearchRow[]>(
    Prisma.sql`
      SELECT id, title, abstract, keywords, subject_category, sit_conference_flag, institution, co_authors, created_at, updated_at,
             ${rankExpr ?? Prisma.sql`0`} as rank
      FROM manuscripts
      WHERE ${where}
      ${orderClause(sort, rankExpr !== null)}
      LIMIT ${limit} OFFSET ${(effectivePage - 1) * limit}
    `
  );

  return { rows, totalCount, effectivePage };
}

// Two-tier search: exact-lexeme tsvector search first (stemming, stop words,
// relevance-ranked via ts_rank — good for real words). If that finds
// nothing, falls back to pg_trgm similarity across title/institution/authors
// so a typo ("manufactring") or a partial name still surfaces something,
// rather than an empty result for what's likely a near-miss. An empty query
// is "browse all published papers" rather than "no results" — the public
// search page defaults to this.
export async function searchPublishedManuscripts({
  query,
  category,
  track,
  year,
  sort = "relevance",
  page = 1,
  limit = 10,
}: {
  query: string;
  category?: string;
  track?: "SIT_CONF" | "STANDARD";
  year?: number;
  sort?: SortMode;
  page?: number;
  limit?: number;
}): Promise<SearchPage> {
  const trimmed = query.trim();
  const safePage = Math.max(1, Math.floor(page) || 1);
  const filters: Prisma.Sql[] = [];
  if (category) filters.push(Prisma.sql`subject_category = ${category}`);
  if (track) filters.push(Prisma.sql`sit_conference_flag = ${track === "SIT_CONF"}`);
  if (year) filters.push(Prisma.sql`extract(year from updated_at) = ${year}`);

  if (!trimmed) {
    const browseResult = await runSearch(null, null, filters, safePage, limit, sort);
    return toSearchPage(browseResult.rows, browseResult.totalCount, browseResult.effectivePage, limit);
  }

  const ftsResult = await runSearch(
    Prisma.sql`search_vector @@ websearch_to_tsquery('english', ${trimmed})`,
    Prisma.sql`ts_rank(search_vector, websearch_to_tsquery('english', ${trimmed}))`,
    filters,
    safePage,
    limit,
    sort
  );

  if (ftsResult.totalCount > 0) {
    return toSearchPage(ftsResult.rows, ftsResult.totalCount, ftsResult.effectivePage, limit);
  }

  const trigramResult = await runSearch(
    Prisma.sql`(similarity(title, ${trimmed}) > ${TRIGRAM_SIMILARITY_THRESHOLD}
      OR similarity(institution, ${trimmed}) > ${TRIGRAM_SIMILARITY_THRESHOLD}
      OR similarity(co_authors::text, ${trimmed}) > ${TRIGRAM_SIMILARITY_THRESHOLD})`,
    Prisma.sql`greatest(similarity(title, ${trimmed}), similarity(institution, ${trimmed}), similarity(co_authors::text, ${trimmed}))`,
    filters,
    safePage,
    limit,
    sort
  );

  return toSearchPage(trigramResult.rows, trigramResult.totalCount, trigramResult.effectivePage, limit);
}

export interface PublishedManuscriptDetail extends SearchResultRow {
  authors: { fullName: string; institution: string; orcid: string }[];
  references: string[];
}

// Public, read-only lookup for the article detail page — deliberately scoped
// to status = PUBLISHED only, so an unpublished manuscript's id can't be
// guessed/enumerated to view draft content that hasn't cleared review.
export async function getPublishedManuscriptDetail(id: string): Promise<PublishedManuscriptDetail | null> {
  const manuscript = await db.manuscript.findFirst({ where: { id, status: "PUBLISHED" } });
  if (!manuscript) return null;

  const coAuthors = Array.isArray(manuscript.co_authors)
    ? (manuscript.co_authors as { firstName?: string; lastName?: string; institution?: string; orcid?: string }[])
    : [];

  return {
    id: manuscript.id,
    manuscriptCode: getManuscriptCode(manuscript.id, manuscript.created_at),
    title: manuscript.title,
    abstract: manuscript.abstract,
    keywords: manuscript.keywords,
    category: manuscript.subject_category,
    track: manuscript.sit_conference_flag ? "SIT_CONF" : "STANDARD",
    institution: manuscript.institution,
    correspondingAuthorName: correspondingAuthorName(manuscript.co_authors),
    publishedAt: manuscript.updated_at,
    rank: 0,
    authors: coAuthors.map((a) => ({
      fullName: [a.firstName, a.lastName].filter(Boolean).join(" ") || "Unknown",
      institution: a.institution ?? "",
      orcid: a.orcid ?? "",
    })),
    references: Array.isArray(manuscript.references) ? (manuscript.references as string[]) : [],
  };
}

// Integration seam for the PUBLISHED transition (called from
// src/lib/actions/manuscript-transitions.ts). A no-op today — the generated
// column already makes the manuscript searchable the instant its status
// commits — kept as the place a real external search engine call would go
// if one is ever added.
export async function onManuscriptPublished(manuscriptId: string): Promise<void> {
  void manuscriptId;
}

const SEARCH_INDEX_NAMES = [
  "manuscripts_search_vector_idx",
  "manuscripts_title_trgm_idx",
  "manuscripts_institution_trgm_idx",
  "manuscripts_co_authors_trgm_idx",
] as const;

// A real maintenance operation (REINDEX), not a data-recompute — the
// generated search_vector column and the trigram indexes are always
// correct for current row content by construction, so there's nothing to
// "resync." REINDEX only helps with index bloat/corruption after heavy
// churn, which is rare at this scale. Exists for completeness; call
// manually if an index ever needs a hard rebuild.
export async function reindexSearchVectors(): Promise<{ index: string; ok: boolean; error?: string }[]> {
  const results: { index: string; ok: boolean; error?: string }[] = [];
  for (const indexName of SEARCH_INDEX_NAMES) {
    try {
      await db.$executeRawUnsafe(`REINDEX INDEX CONCURRENTLY "${indexName}"`);
      results.push({ index: indexName, ok: true });
    } catch (err) {
      results.push({ index: indexName, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}
