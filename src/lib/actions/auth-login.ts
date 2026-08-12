"use server";

import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export interface LoginStepResult {
  success: boolean;
  error?: string;
}

// AuthError.status is always present on a real GoTrue API response (4xx —
// "Invalid login credentials", "Email not confirmed", rate limits, etc.) —
// those are the intentional, user-facing messages this form is designed to
// show. A 5xx/undefined status means something failed before or outside a
// normal API response (GoTrue itself erroring, a transient fetch failure) —
// Supabase's own message text for those is not written to be shown to an
// end user and has, in practice, surfaced internal wording like "Database
// error querying schema" during this project's own testing. Anonymous,
// unauthenticated callers reach this on every login attempt, so this is the
// one place in the app where a third-party SDK's error message is passed
// straight through to the least-trusted possible caller.
function safeAuthErrorMessage(error: { message: string; status?: number }, fallback: string): string {
  if (typeof error.status === "number" && error.status < 500) return error.message;
  return fallback;
}

// Supabase has no native email-OTP second factor (its MFA system only
// supports 'totp'/'phone' factor types — verified against the installed
// @supabase/auth-js types, not assumed). This is the safest real substitute:
// verify the password against actual GoTrue, but through a client whose
// cookie adapter is a no-op, so the resulting session is never persisted or
// sent to the browser — then immediately sign out of it server-side to
// revoke the token rather than leaving it to expire unused. The browser
// receives only { success, error } here, never a token. A real session only
// ever gets created client-side by verifyOtp() in the next step, which is
// what actually matters for "no access before OTP succeeds": nothing before
// that point can set a session cookie.
export async function verifyPasswordAndSendLoginOtpAction({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<LoginStepResult> {
  const { url, key } = getSupabaseEnv();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });

  const { error: passwordError } = await supabase.auth.signInWithPassword({ email, password });
  if (passwordError) {
    return { success: false, error: safeAuthErrorMessage(passwordError, "Something went wrong. Please try again.") };
  }

  // Password confirmed — revoke the transient session this just created
  // rather than leaving an unused-but-valid refresh token sitting around.
  await supabase.auth.signOut();

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (otpError) {
    return { success: false, error: safeAuthErrorMessage(otpError, "Something went wrong. Please try again.") };
  }

  return { success: true };
}
