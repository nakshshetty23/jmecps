"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { safeAuthErrorMessage } from "@/lib/auth/safe-auth-error";
import { changeEmailSchema } from "@/lib/validations/auth";

export interface EmailChangeStepResult {
  success: boolean;
  error?: string;
}

// Unlike login/register/password-reset (which run before any session
// exists and so key their limiter by IP), this action always requires an
// existing, authenticated identity — user.id is a more precise scope than
// IP for "how many times can THIS account request a change," and avoids
// one shared office/NAT'd IP's researchers from ever contending for the
// same bucket. Same 5/60s policy as every other auth-sensitive action in
// this app.
const EMAIL_CHANGE_RATE_LIMIT = 5;
const EMAIL_CHANGE_RATE_WINDOW_MS = 60 * 1000;

// Only ever acts on the CALLER's own session — getUser() below reads
// whoever the current request's cookies belong to, the same pattern every
// other authenticated Server Action in this app already uses (e.g.
// saveDraftAction). There is no target-user-id parameter anywhere in this
// function for a client to manipulate.
export async function requestEmailChangeAction(input: unknown): Promise<EmailChangeStepResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in to change your email." };
  }

  const parsed = changeEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  // Current email comes only from the authenticated Supabase user, never
  // from the client — a client-supplied "current email" would be exactly
  // the kind of trusted-client-identity field this phase forbids.
  const currentEmail = (user.email ?? "").toLowerCase();
  const newEmail = parsed.data.newEmail;
  if (newEmail.toLowerCase() === currentEmail) {
    return { success: false, error: "That's already your current email address." };
  }

  const rateLimit = checkRateLimit(`email-change:${user.id}`, EMAIL_CHANGE_RATE_LIMIT, EMAIL_CHANGE_RATE_WINDOW_MS);
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many email change requests. Please wait a minute and try again." };
  }

  // No redirectTo/callback — Supabase's own confirmation email links back
  // to wherever this project's dashboard-configured Site URL points by
  // default; no client-controlled destination is ever accepted here (see
  // Phase 1.3.6.1's open-redirect finding for /forgot-password's approach,
  // deliberately not repeated here since this project has no equivalent
  // "must land on our own new page" requirement for email confirmation —
  // Supabase's own account-management UI/flow handles it).
  //
  // Enumeration decision (Phase 1.3.6.1, item G): an "already in use" error
  // from Supabase is a genuine, intentional 4xx GoTrue message (the same
  // class already relied on for registration's duplicate-email handling in
  // Phase 1.1) — passed through via safeAuthErrorMessage() like every other
  // error here, rather than special-casing it with a different, bespoke
  // suppression. The requester is already authenticated (unlike anonymous
  // registration), so this is a strictly lower-stakes signal than what
  // registration already exposes to anyone, and inventing an inconsistent,
  // one-off treatment for just this error class would itself be a
  // deviation from this app's established error-handling convention.
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) {
    return { success: false, error: safeAuthErrorMessage(error, "Something went wrong. Please try again.") };
  }

  return { success: true };
}
