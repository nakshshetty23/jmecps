"use server";

import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export interface LoginStepResult {
  success: boolean;
  error?: string;
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
    return { success: false, error: passwordError.message };
  }

  // Password confirmed — revoke the transient session this just created
  // rather than leaving an unused-but-valid refresh token sitting around.
  await supabase.auth.signOut();

  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (otpError) {
    return { success: false, error: otpError.message };
  }

  return { success: true };
}
