"use server";

import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/logger";

// Called from the client right after a successful signInWithPassword /
// signUp — those calls go straight from the browser to Supabase, never
// through our server, so there's no other point to observe them from. This
// re-confirms identity via getUser() server-side rather than trusting
// whatever the client claims just happened.
export async function recordLoginAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await logAuditEvent({ userId: user.id, action: "auth.login" });
}

export async function recordRegisterAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await logAuditEvent({ userId: user.id, action: "auth.register" });
}
