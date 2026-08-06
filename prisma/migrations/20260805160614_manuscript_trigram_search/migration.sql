-- Trigram indexes for fuzzy/typo-tolerant matching, used as a fallback when
-- the exact-lexeme tsvector search (search_vector, from the prior migration)
-- returns nothing — e.g. a misspelled title or author name.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX manuscripts_title_trgm_idx ON manuscripts USING GIN (title gin_trgm_ops);
CREATE INDEX manuscripts_institution_trgm_idx ON manuscripts USING GIN (institution gin_trgm_ops);
-- Author names/affiliations live in co_authors (jsonb), not a plain column —
-- an expression index on its text form lets similarity() fuzzy-match names
-- without a separate normalized authors table.
CREATE INDEX manuscripts_co_authors_trgm_idx ON manuscripts USING GIN ((co_authors::text) gin_trgm_ops);
