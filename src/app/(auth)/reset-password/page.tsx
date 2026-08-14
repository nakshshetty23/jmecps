"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { newPasswordSchema } from "@/lib/validations/auth";
import { resetPasswordAction } from "@/lib/actions/auth-password-reset";

type Status = "checking" | "ready" | "invalid" | "done";

// How long to wait for Supabase's own client-side processing of the
// recovery link (hash fragment or PKCE code, depending on this project's
// configured flow) to fire PASSWORD_RECOVERY or otherwise establish a
// session, before concluding the link is invalid/expired rather than just
// slow to resolve.
const RECOVERY_DETECT_TIMEOUT_MS = 5000;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        settled = true;
        setStatus("ready");
      }
    });

    // PASSWORD_RECOVERY can fire before this listener is attached (it's
    // driven by the SDK's own hash/code processing on load) — Supabase's
    // own documented pattern is to also check directly in case it already
    // happened.
    supabase.auth.getSession().then(({ data }) => {
      if (!settled && data.session) {
        settled = true;
        setStatus("ready");
      }
    });

    const timeout = setTimeout(() => {
      if (!settled) setStatus("invalid");
    }, RECOVERY_DETECT_TIMEOUT_MS);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = newPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPasswordAction(parsed.data);
      if (!result.success) {
        setError(result.error ?? "Could not update your password. Please try again.");
        return;
      }
      setStatus("done");
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="heading-display text-2xl text-primary">Reset Password</CardTitle>
          <CardDescription>
            {status === "ready" && "Choose a new password for your account."}
            {status === "checking" && "Verifying your reset link…"}
            {status === "invalid" && "This link is no longer valid."}
            {status === "done" && "Your password has been updated."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "checking" && <p className="text-sm text-muted-foreground">Please wait…</p>}

          {status === "invalid" && (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                This password reset link is invalid or has expired. Please request a new one.
              </div>
              <Link href="/forgot-password" className="text-center text-sm text-accent hover:underline">
                Request a new reset link
              </Link>
            </div>
          )}

          {status === "done" && (
            <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
              Your password was updated. Redirecting to login…
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 bg-primary text-primary-foreground hover:bg-primary/80"
              >
                {isSubmitting ? "Updating…" : "Update Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
