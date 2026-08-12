// Every id/manuscript_id/user_id/issue_id column in this schema is
// @db.Uuid. Postgres rejects a non-UUID-shaped string for those columns at
// the driver level — a raw, unhandled PrismaClientKnownRequestError, thrown
// before any query's own "not found" handling ever runs. Any function that
// takes a caller-supplied id (a route param, a Server Action argument) and
// passes it into a query against one of those columns needs this check
// first, so a malformed id fails the same safe "not found"/denied way a
// well-formed-but-nonexistent id already does.
//
// Not every string-typed id in this codebase is a UUID — Razorpay order/
// payment ids (Payment.transaction_ref) and audit ids are plain strings on
// purpose and must NOT be run through this; only values queried against an
// actual @db.Uuid column belong here.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}
