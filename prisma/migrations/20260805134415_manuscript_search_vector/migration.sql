-- Postgres's two-arg to_tsvector(regconfig, text) is classified STABLE, not
-- IMMUTABLE (the config name lookup could theoretically change), so it can't
-- be used directly in a GENERATED column expression. Wrapping it in a SQL
-- function that hardcodes 'english' and asserting IMMUTABLE ourselves is the
-- standard, widely-documented workaround — safe here since the config really
-- is fixed at deploy time.
CREATE OR REPLACE FUNCTION jmecps_to_tsvector_english(input text)
RETURNS tsvector AS $$
  SELECT to_tsvector('english', input);
$$ LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE;

-- array_to_string is likewise only STABLE, not IMMUTABLE, in Postgres —
-- same wrapper trick.
CREATE OR REPLACE FUNCTION jmecps_array_to_string(input text[], sep text)
RETURNS text AS $$
  SELECT array_to_string(input, sep);
$$ LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE;

-- Full-text search index as a GENERATED STORED column — Postgres recomputes
-- it automatically on every INSERT/UPDATE, so it can never drift out of sync
-- the way a separately-maintained Elasticsearch index could. Weighted by
-- field importance ('A' highest): title > abstract/keywords > category,
-- institution, and author names (flattened from the co_authors JSON — a
-- plain jsonb::text cast picks up name/institution string values along with
-- some harmless key-name noise, without a separate normalized authors table).
-- HTML tags are stripped from title/abstract before indexing.
ALTER TABLE "manuscripts" ADD COLUMN "search_vector" tsvector
GENERATED ALWAYS AS (
  setweight(jmecps_to_tsvector_english(regexp_replace(coalesce(title, ''), '<[^>]*>', '', 'g')), 'A') ||
  setweight(jmecps_to_tsvector_english(regexp_replace(coalesce(abstract, ''), '<[^>]*>', '', 'g')), 'B') ||
  setweight(jmecps_to_tsvector_english(jmecps_array_to_string(keywords, ' ')), 'B') ||
  setweight(jmecps_to_tsvector_english(coalesce(subject_category, '')), 'C') ||
  setweight(jmecps_to_tsvector_english(coalesce(institution, '')), 'C') ||
  setweight(jmecps_to_tsvector_english(coalesce(co_authors::text, '')), 'C')
) STORED;

CREATE INDEX "manuscripts_search_vector_idx" ON "manuscripts" USING GIN ("search_vector");
