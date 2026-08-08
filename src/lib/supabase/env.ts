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
export function getSupabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local locally, or in Vercel under Project Settings -> Environment Variables (all environments that need it, then redeploy)."
    );
  }
  if (!key) {
    throw new Error(
      "Missing Supabase API key: set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local locally, or in Vercel under Project Settings -> Environment Variables (all environments that need it, then redeploy)."
    );
  }

  return { url, key };
}
