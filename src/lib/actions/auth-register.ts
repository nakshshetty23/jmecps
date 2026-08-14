"use server";

import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { registerSchema } from "@/lib/validations/auth";
import { safeAuthErrorMessage } from "@/lib/auth/safe-auth-error";

export interface RegisterStepResult {
  success: boolean;
  error?: string;
}

// Phase 1.1 audit finding: registration previously called
// supabase.auth.signUp() directly from the browser, gated only by
// registerSchema on the client. Confirmed live that Supabase's own signUp()
// endpoint accepts passwords this app's own policy explicitly rejects (e.g.
// "abc123") when called directly, bypassing our client-side check entirely
// — no server-side enforcement of the PRD's "high-entropy password"
// requirement existed. This re-validates the exact same registerSchema
// server-side (the authoritative gate) before ever calling Supabase,
// mirroring the same client -> Server Action -> Supabase pattern login's
// verifyPasswordAndSendLoginOtpAction already uses. Supabase Auth remains
// solely responsible for actually creating the account and storing/hashing
// the password — this only rejects malformed/weak input earlier, using
// rules the client already agreed to, not new ones.
//
// zod's default "strip" mode also means any extra key (e.g. a client
// attempting to smuggle `role` into the payload) is silently dropped by
// safeParse before anything is ever forwarded to Supabase — options.data
// below is built from only the four validated fields, never the raw input.
export async function registerAccountAction(input: unknown): Promise<RegisterStepResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid registration details." };
  }
  const { fullName, email, institutionalAffiliation, password } = parsed.data;

  const { url, key } = getSupabaseEnv();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });

  // "Confirm email" is enabled on this project (see auth-login.ts's same
  // note on the login flow) — signUp() creates the account but withholds a
  // session until the OTP step verifies, identical to what the previous
  // client-side call already did. The no-op cookie adapter above means
  // nothing here could set a session cookie regardless.
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        institutional_affiliation: institutionalAffiliation,
      },
    },
  });
  if (signUpError) {
    return { success: false, error: safeAuthErrorMessage(signUpError, "Something went wrong. Please try again.") };
  }

  return { success: true };
}
