// Shared by auth-login.ts and auth-register.ts — not itself a Server Action,
// so it can't live inside either "use server" file (every export from one of
// those must be an async function; this is a plain sync helper).
//
// AuthError.status is always present on a real GoTrue API response (4xx —
// "Invalid login credentials", "Email not confirmed", rate limits, etc.) —
// those are the intentional, user-facing messages these forms are designed
// to show. A 5xx/undefined status means something failed before or outside
// a normal API response (GoTrue itself erroring, a transient fetch failure)
// — Supabase's own message text for those is not written to be shown to an
// end user and has, in practice, surfaced internal wording like "Database
// error querying schema" during this project's own testing. Anonymous,
// unauthenticated callers reach this on every login/registration attempt,
// so this is a place a third-party SDK's error message would otherwise be
// passed straight through to the least-trusted possible caller.
export function safeAuthErrorMessage(error: { message: string; status?: number }, fallback: string): string {
  if (typeof error.status === "number" && error.status < 500) return error.message;
  return fallback;
}
