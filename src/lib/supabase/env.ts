// Shared by client.ts (browser), server.ts (server-only), and
// middleware.ts (proxy.ts) — all three need the same URL/key resolution,
// and all three need the same failure mode: a clear, named error instead of
// Supabase SSR's generic "Your project's URL and Key are required" (which
// doesn't say which var is missing). NEXT_PUBLIC_* values are inlined into
// the client bundle at Next.js build time, so if these are unset during a
// Vercel build, the browser bundle permanently bakes in `undefined` — no
// runtime fix, only a rebuild with the vars actually configured in Vercel's
// Project Settings -> Environment Variables helps.
//
// PUBLISHABLE_KEY is this project's actual variable (see .env.local) —
// Supabase's current dashboard calls it that, not ANON_KEY. The ANON_KEY
// fallback exists only in case a deployment's environment was set up
// against the older naming.
//
// The URL is checked for more than presence: @supabase/supabase-js throws
// two DIFFERENT messages depending on the failure —
//   - unset/empty: "supabaseUrl is required."
//   - set but not a valid http(s) URL: "Invalid supabaseUrl: Must be a
//     valid HTTP or HTTPS URL."
// A production report of the second message means the variable IS present
// (this function's own presence check would otherwise have thrown first,
// with a different, named message) but its value isn't a well-formed URL —
// most often because the deployment platform's env var UI stored a
// pasted-in value that still has its surrounding quotes (copied straight
// from a ".env" file's KEY="value" line) or is missing the "https://"
// scheme. Neither is fixable in code without masking a real deployment
// misconfiguration, so this validates and reports the shape of the
// problem rather than silently stripping/defaulting it.
function assertValidHttpUrl(rawValue: string, varName: string): string {
  const trimmed = rawValue.trim();
  const looksQuoteWrapped = /^["'][\s\S]*["']$/.test(trimmed);

  let isValidHttpUrl = false;
  try {
    const parsed = new URL(trimmed);
    isValidHttpUrl = parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    isValidHttpUrl = false;
  }

  if (!isValidHttpUrl) {
    throw new Error(
      `${varName} is set (length ${trimmed.length}) but isn't a valid http(s) URL.` +
        (looksQuoteWrapped
          ? ' It looks like it still has literal " or \' characters around it — remove the surrounding quotes from the value in Vercel\'s Project Settings -> Environment Variables (paste only the URL itself, not the KEY="..." line).'
          : " Expected format: https://<project-ref>.supabase.co") +
        " Then redeploy."
    );
  }

  return trimmed;
}

export function getSupabaseEnv(): { url: string; key: string } {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local locally, or in Vercel under Project Settings -> Environment Variables (all environments that need it, then redeploy)."
    );
  }
  if (!rawKey) {
    throw new Error(
      "Missing Supabase API key: set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local locally, or in Vercel under Project Settings -> Environment Variables (all environments that need it, then redeploy)."
    );
  }

  const url = assertValidHttpUrl(rawUrl, "NEXT_PUBLIC_SUPABASE_URL");
  const key = rawKey.trim();

  return { url, key };
}
