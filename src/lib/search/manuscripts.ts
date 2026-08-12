import "server-only";
import { unstable_cache, updateTag } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getManuscriptCode } from "@/lib/manuscript-code";

// unstable_cache serializes return values (Dates become ISO strings on a
// cache hit, since the cache store round-trips through JSON), so both
// cached wrapper functions below convert Date fields to strings going in
// and back to Date objects coming out — otherwise callers would see
// inconsistent types depending on whether the read was a hit or a miss.
// publishedAt is nullable (Phase 6.6) — a manuscript published before this
// field existed, or reached PUBLISHED through a path that predates it, has
// no reliable first-publication timestamp, and null is the honest value
// rather than a fabricated one.
type Serialized<T> = Omit<T, "publishedAt"> & { publishedAt: string | null };

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
  // Null for a manuscript that reached PUBLISHED before this field existed
  // (or through a path that predates it) — see Manuscript.published_at's
  // schema comment. Never fabricated; UI must render an honest fallback.
  publishedAt: Date | null;
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
  published_at: Date | null;
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
      publishedAt: r.published_at,
      rank: r.rank,
    })),
    totalCount,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(totalCount / limit)),
  };
}

type SortMode = "relevance" | "newest" | "oldest";

// published_at (Phase 6.6) is the real ordering signal for "newest"/
// "oldest" — these modes are explicitly about publication recency, not
// last-edited time. NULLS LAST on the DESC path keeps manuscripts with no
// recorded publication date (published before this field existed) from
// jumping to the front of "newest" instead of sinking to the back;
// updated_at stays only as a deterministic tiebreaker, never as a
// displayed value.
function orderClause(sort: SortMode, hasRank: boolean): Prisma.Sql {
  if (sort === "oldest") return Prisma.sql`ORDER BY published_at ASC NULLS LAST, updated_at ASC`;
  if (sort === "newest" || !hasRank) return Prisma.sql`ORDER BY published_at DESC NULLS LAST, updated_at DESC`;
  return Prisma.sql`ORDER BY rank DESC, published_at DESC NULLS LAST, updated_at DESC`;
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
      SELECT id, title, abstract, keywords, subject_category, sit_conference_flag, institution, co_authors, created_at, updated_at, published_at,
             ${rankExpr ?? Prisma.sql`0`} as rank
      FROM manuscripts
      WHERE ${where}
      ${orderClause(sort, rankExpr !== null)}
      LIMIT ${limit} OFFSET ${(effectivePage - 1) * limit}
    `
  );

  return { rows, totalCount, effectivePage };
}

interface SearchParams {
  query: string;
  category?: string;
  track?: "SIT_CONF" | "STANDARD";
  year?: number;
  sort?: SortMode;
  page?: number;
  limit?: number;
}

// Two-tier search: exact-lexeme tsvector search first (stemming, stop words,
// relevance-ranked via ts_rank — good for real words). If that finds
// nothing, falls back to pg_trgm similarity across title/institution/authors
// so a typo ("manufactring") or a partial name still surfaces something,
// rather than an empty result for what's likely a near-miss. An empty query
// is "browse all published papers" rather than "no results" — the public
// search page defaults to this.
async function searchPublishedManuscriptsUncached({
  query,
  category,
  track,
  year,
  sort = "relevance",
  page = 1,
  limit = 10,
}: SearchParams): Promise<SearchPage> {
  const trimmed = query.trim();
  const safePage = Math.max(1, Math.floor(page) || 1);
  const filters: Prisma.Sql[] = [];
  if (category) filters.push(Prisma.sql`subject_category = ${category}`);
  if (track) filters.push(Prisma.sql`sit_conference_flag = ${track === "SIT_CONF"}`);
  // A manuscript with no recorded published_at (see the field's schema
  // comment) can't honestly match a "filter by publication year" query —
  // extract(year from NULL) is NULL, so it's correctly excluded rather
  // than matched against a guessed year.
  if (year) filters.push(Prisma.sql`extract(year from published_at) = ${year}`);

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

// Cached per distinct parameter combination (the params, JSON-stringified,
// are part of the cache key) — a 60s safety-net revalidation plus on-demand
// invalidation via revalidateTag("search-results") whenever a manuscript's
// PUBLISHED status changes (see onManuscriptPublished below), so a newly
// published paper doesn't wait out the window to appear.
export async function searchPublishedManuscripts(params: SearchParams): Promise<SearchPage> {
  const cacheKey = JSON.stringify(params);
  const cached = await unstable_cache(
    async () => {
      const result = await searchPublishedManuscriptsUncached(params);
      return { ...result, rows: result.rows.map((r) => ({ ...r, publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null })) };
    },
    ["search-published-manuscripts", cacheKey],
    { tags: ["search-results"], revalidate: 60 }
  )();

  return { ...cached, rows: cached.rows.map((r) => ({ ...r, publishedAt: r.publishedAt ? new Date(r.publishedAt) : null })) };
}

export interface PublishedManuscriptDetail extends SearchResultRow {
  authors: { fullName: string; institution: string; orcid: string }[];
  references: string[];
}

// Public, read-only lookup for the article detail page — deliberately scoped
// to status = PUBLISHED only, so an unpublished manuscript's id can't be
// guessed/enumerated to view draft content that hasn't cleared review.
async function getPublishedManuscriptDetailUncached(id: string): Promise<PublishedManuscriptDetail | null> {
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
    publishedAt: manuscript.published_at,
    rank: 0,
    authors: coAuthors.map((a) => ({
      fullName: [a.firstName, a.lastName].filter(Boolean).join(" ") || "Unknown",
      institution: a.institution ?? "",
      orcid: a.orcid ?? "",
    })),
    references: Array.isArray(manuscript.references) ? (manuscript.references as string[]) : [],
  };
}

// Longer-lived cache (published articles don't change post-publish in this
// app — there's no edit-after-publish flow) tagged both globally and
// per-article, so a specific article can be invalidated without flushing
// every other cached article too.
export async function getPublishedManuscriptDetail(id: string): Promise<PublishedManuscriptDetail | null> {
  const cached = await unstable_cache(
    async () => {
      const result = await getPublishedManuscriptDetailUncached(id);
      if (!result) return null;
      return { ...result, publishedAt: result.publishedAt ? result.publishedAt.toISOString() : null } satisfies Serialized<PublishedManuscriptDetail>;
    },
    ["published-manuscript-detail", id],
    { tags: ["search-results", `article-${id}`], revalidate: 3600 }
  )();

  if (!cached) return null;
  return { ...cached, publishedAt: cached.publishedAt ? new Date(cached.publishedAt) : null };
}

// Called from every manuscript transition (src/lib/actions/manuscript-
// transitions.ts, finalize-submission.ts, editorial.ts) whenever a
// manuscript enters or leaves PUBLISHED — the generated search_vector
// column already makes it searchable/unsearchable in the database instantly
// (see the module doc comment above), but the cached read layer above still
// needs telling. Broad ("search-results") rather than surgical, since
// invalidating only the specific query combinations a manuscript would now
// match/not-match isn't practical — safe, just slightly more invalidation
// than the theoretical minimum.
export async function onManuscriptPublished(manuscriptId: string): Promise<void> {
  updateTag("search-results");
  updateTag(`article-${manuscriptId}`);
}

// Phase 6.4 — the public /volumes-and-issues archive's one data need: which
// manuscripts assigned to a given issue are actually PUBLISHED right now.
// issue_id is purely an admin-assigned grouping (src/lib/actions/issues.ts)
// with no bearing on visibility — this re-applies the exact same
// status = PUBLISHED gate as every other public read in this file, so an
// issue assignment can never surface a manuscript that hasn't cleared the
// state machine. Reuses parseAuthors/correspondingAuthorName/authorSummaries
// above rather than duplicating that shaping logic, and shares the same
// "search-results" cache tag so onManuscriptPublished's existing
// invalidation (a manuscript entering/leaving PUBLISHED) covers this too.
export interface IssueManuscriptSummary {
  id: string;
  title: string;
  correspondingAuthorName: string | null;
  authors: AuthorSummary[];
  // Same field/meaning as SearchResultRow.publishedAt (Phase 6.6:
  // manuscript.published_at, not updated_at — see that field's schema
  // comment for why). Nullable for manuscripts that reached PUBLISHED
  // before this field existed.
  publishedAt: Date | null;
}

async function getPublishedManuscriptsForIssueUncached(issueId: string): Promise<IssueManuscriptSummary[]> {
  const rows = await db.manuscript.findMany({
    where: { issue_id: issueId, status: "PUBLISHED" },
    select: { id: true, title: true, co_authors: true, published_at: true, updated_at: true },
    orderBy: [{ published_at: { sort: "desc", nulls: "last" } }, { updated_at: "desc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    correspondingAuthorName: correspondingAuthorName(r.co_authors),
    authors: authorSummaries(r.co_authors),
    publishedAt: r.published_at,
  }));
}

export async function getPublishedManuscriptsForIssue(issueId: string): Promise<IssueManuscriptSummary[]> {
  // unstable_cache round-trips through JSON — publishedAt (a Date) comes
  // back as a string on a cache hit but stays a real Date on a miss unless
  // explicitly normalized both ways, same as searchPublishedManuscripts/
  // getPublishedManuscriptDetail above handle their own Date fields.
  const cached = await unstable_cache(
    async () => {
      const rows = await getPublishedManuscriptsForIssueUncached(issueId);
      return rows.map((r) => ({ ...r, publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null }));
    },
    ["published-manuscripts-for-issue", issueId],
    { tags: ["search-results", `issue-${issueId}`], revalidate: 60 }
  )();

  return cached.map((r) => ({ ...r, publishedAt: r.publishedAt ? new Date(r.publishedAt) : null }));
}

export interface PublicIssueSummary {
  id: string;
  volumeNumber: number;
  issueNumber: number;
  publishedAt: Date;
}

// published_at IS NOT NULL is the one signal this schema has for "this
// issue is ready to show publicly" — an issue can exist and have
// manuscripts assigned to it (src/lib/actions/issues.ts) while a
// SUPER_ADMIN is still preparing it, without that alone making it public;
// setting a publication date is the deliberate act of announcing it. Not
// cached like the functions above: the issue list itself is small and
// changes rarely, so a direct read keeps this simple rather than adding
// another cache key/tag pair for little benefit.
export async function getPublicIssues(): Promise<PublicIssueSummary[]> {
  const issues = await db.issue.findMany({
    where: { published_at: { not: null } },
    // Newest published issue first — published_at is the actual ordering
    // signal (an admin could in principle publish a lower volume/issue
    // number later), with volume/issue number only as a deterministic
    // tiebreaker for same-date issues.
    orderBy: [{ published_at: "desc" }, { volume_number: "desc" }, { issue_number: "desc" }],
    select: { id: true, volume_number: true, issue_number: true, published_at: true },
  });
  return issues.map((i) => ({
    id: i.id,
    volumeNumber: i.volume_number,
    issueNumber: i.issue_number,
    publishedAt: i.published_at!,
  }));
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
