"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { safeAuthErrorMessage } from "@/lib/auth/safe-auth-error";
import { requestPasswordResetSchema, newPasswordSchema } from "@/lib/validations/auth";

export interface PasswordResetStepResult {
  success: boolean;
  error?: string;
}

// Same policy as login's real attempt boundary (Phase 6.14) — a password
// reset request is exactly as sensitive as a login attempt and deserves the
// same protection, on its own dedicated bucket so it can never be diluted
// by (or dilute) the login bucket.
const PASSWORD_RESET_RATE_LIMIT = 5;
const PASSWORD_RESET_RATE_WINDOW_MS = 60 * 1000;

// Deliberately the REAL, cookie-wired server client (src/lib/supabase/
// server.ts) here, not a no-op adapter like verifyPasswordAndSendLoginOtpAction
// uses. Those are different situations: that action's no-op adapter exists
// specifically to stop a *session* from reaching the browser before OTP
// succeeds (signInWithPassword establishes one; letting it leak would be a
// real premature-access bug). resetPasswordForEmail() never establishes a
// session at all, so that risk doesn't apply here — but a different one
// does. This project's Supabase clients default to PKCE flow (@supabase/ssr
// 0.12.3, no flowType override anywhere in this codebase), which requires a
// code verifier to be persisted in a cookie on whichever client calls
// resetPasswordForEmail(), so it can later be matched when the emailed link
// is clicked. A no-op adapter would silently discard that verifier and
// break every recovery link, indistinguishably from a normal expired-link
// error. Using the real per-request cookie store here is what makes the
// link actually work.
//
// Phase 1.3.14/1.3.15 finding: this used to derive the origin straight from
// the request's `x-forwarded-host`/`host` headers, with no validation —
// both are attacker-controllable on any request the caller sends, and
// nothing here checked the value against this app's own known domain
// before embedding it in a real password-reset email. Confirmed live that
// Supabase's own resetPasswordForEmail() call does not reject an
// unrecognized redirectTo host at the API-call level either, so the
// application itself is the only place this can safely be closed off.
//
// SITE_URL (server-only, optional — see .env.example) is now the sole
// trusted source for this. When set, it's used verbatim and the request's
// Host/X-Forwarded-Host headers are never consulted for this purpose at
// all — not "validated against," genuinely never read. When SITE_URL is
// unset, only a request that's actually addressed to localhost/127.0.0.1
// (real local development, where there is no meaningfully different
// "attacker-controlled" destination to redirect to) is accepted; any other
// case fails closed with a thrown error rather than silently falling back
// to trusting an unvalidated header, matching the same "fail loudly on
// missing required config" convention getSupabaseEnv() already uses in
// src/lib/supabase/env.ts. A deployed (non-local) environment must set
// SITE_URL before password-reset requests can be processed.
function assertValidHttpUrl(raw: string): string {
  const trimmed = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`SITE_URL is set but isn't a valid URL: ${JSON.stringify(raw)}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`SITE_URL must be an http(s) URL, got: ${JSON.stringify(raw)}`);
  }
  // Origin only (scheme + host [+ port]) — any path/query/hash on a
  // configured SITE_URL would be a config mistake, not something to concatenate.
  return parsed.origin;
}

function getSiteOrigin(host: string | null): string {
  const configured = process.env.SITE_URL;
  if (configured) {
    return assertValidHttpUrl(configured);
  }

  const h = host ?? "localhost:3000";
  const isLocal = h.startsWith("localhost") || h.startsWith("127.0.0.1");
  if (isLocal) {
    return `http://${h}`;
  }

  throw new Error(
    "SITE_URL is not configured. Set SITE_URL (e.g. https://jmecps.com) in the environment before password-reset requests can be processed — the request's Host header is no longer trusted for this (see Phase 1.3.15)."
  );
}

// Anti-enumeration: Supabase's own resetPasswordForEmail() already returns
// success for an email that doesn't belong to any account (this is
// documented, intentional Supabase behavior, not something this action has
// to fake) — so simply passing through whatever it returns, without ever
// querying public.users/auth.users ourselves to check existence first, is
// already the safe behavior. The only distinguishable outcome is the rate
// limiter, which is expected and matches every other rate-limited action in
// this app.
export async function requestPasswordResetAction(input: unknown): Promise<PasswordResetStepResult> {
  const parsed = requestPasswordResetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  const headerList = await headers();
  const ip = getClientIp(headerList);
  const rateLimit = checkRateLimit(`password-reset:${ip}`, PASSWORD_RESET_RATE_LIMIT, PASSWORD_RESET_RATE_WINDOW_MS);
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many password reset requests. Please wait a minute and try again." };
  }

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  let redirectTo: string;
  try {
    redirectTo = `${getSiteOrigin(host)}/reset-password`;
  } catch (err) {
    // Fails closed: a missing/invalid SITE_URL must never fall back to
    // trusting the request's Host header. Logged server-side for an
    // operator to notice and fix; the caller gets the same generic,
    // anti-enumeration-safe failure shape as every other error path here.
    console.error("Password reset request could not determine a safe redirect origin:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
  if (error) {
    return { success: false, error: safeAuthErrorMessage(error, "Something went wrong. Please try again.") };
  }

  return { success: true };
}

// Called from /reset-password once the browser has already established a
// recovery session (via Supabase's own onAuthStateChange PASSWORD_RECOVERY
// event — see that page). getUser() here is the same authorization pattern
// every other authenticated Server Action in this app already uses; there
// is no separate "recovery session" system to invent, this IS a real
// Supabase session, just one GoTrue marks as originating from a recovery
// link rather than a normal sign-in.
export async function resetPasswordAction(input: unknown): Promise<PasswordResetStepResult> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Your password reset link has expired. Please request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { success: false, error: safeAuthErrorMessage(error, "Something went wrong. Please try again.") };
  }

  // Require a fresh, deliberate login with the new password rather than
  // silently continuing on the recovery session — the same "a real sign-in
  // round trip is what establishes ongoing access" principle already
  // applied to every other session boundary in this app.
  await supabase.auth.signOut();

  return { success: true };
}
