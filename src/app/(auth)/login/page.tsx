"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { getDashboardPath, getSafeCallbackUrl, type Role } from "@/lib/auth/rbac";
import { recordLoginAction } from "@/lib/actions/auth-events";
import { emailSchema } from "@/lib/validations/auth";
import OtpVerifyStep, { type OtpActionResult } from "@/components/auth/OtpVerifyStep";

type Step = "email" | "otp";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function sendOtp(emailValue: string): Promise<OtpActionResult> {
    const supabase = createClient();
    // shouldCreateUser: false — login must not silently create a new
    // account for an email that was never registered. Supabase returns an
    // error in that case, which is exactly the "not registered yet" signal
    // this flow surfaces to the user.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: emailValue,
      options: { shouldCreateUser: false },
    });
    if (otpError) return { success: false, error: otpError.message };
    return { success: true };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setEmail(parsed.data.email);

    setIsSubmitting(true);
    try {
      const result = await sendOtp(parsed.data.email);
      if (!result.success) {
        setError(result.error ?? "Could not send the login code. Please try again.");
        return;
      }
      setStep("otp");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerify(token: string): Promise<OtpActionResult> {
    const supabase = createClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (verifyError) return { success: false, error: verifyError.message };

    void recordLoginAction();

    // app_metadata, not user_metadata — the latter is client-writable and
    // no longer trusted for role (see getUserRole in lib/auth/rbac.ts).
    // This is just picking where to redirect; the proxy re-derives the
    // real role server-side from the same app_metadata field regardless.
    const role = data.user?.app_metadata?.role as Role | undefined;
    const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
    router.push(callbackUrl || getDashboardPath(role ?? "RESEARCHER"));
    router.refresh();
    return { success: true };
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="heading-display text-2xl text-primary">Log In</CardTitle>
        <CardDescription>
          {step === "email" ? "Access your JMECPS account." : "Enter the code we sent you."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "email" ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-2 bg-primary text-primary-foreground hover:bg-primary/80">
              {isSubmitting ? "Sending code…" : "Send Login OTP"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-accent hover:underline">
                Register
              </Link>
            </p>
          </form>
        ) : (
          <OtpVerifyStep
            email={email}
            onVerify={handleVerify}
            onResend={() => sendOtp(email)}
            onChangeEmail={() => {
              setStep("email");
              setError(null);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <Suspense fallback={<div className="w-full max-w-md">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
