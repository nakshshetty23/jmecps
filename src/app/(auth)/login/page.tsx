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
import { verifyPasswordAndSendLoginOtpAction } from "@/lib/actions/auth-login";
import { loginCredentialsSchema } from "@/lib/validations/auth";
import OtpVerifyStep, { type OtpActionResult } from "@/components/auth/OtpVerifyStep";

type Step = "credentials" | "otp";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = loginCredentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setEmail(parsed.data.email);

    setIsSubmitting(true);
    try {
      // Password verification happens server-side (see auth-login.ts) —
      // only { success, error } comes back here, never a session or token,
      // so nothing about this request can leave the browser authenticated.
      const result = await verifyPasswordAndSendLoginOtpAction({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (!result.success) {
        setError(result.error ?? "Could not verify your credentials. Please try again.");
        return;
      }
      setStep("otp");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend(): Promise<OtpActionResult> {
    const supabase = createClient();
    // Resending a login OTP doesn't need to re-check the password — the
    // user already proved it in the step before this one. Per Supabase's
    // own guidance, resending an OTP-login code is just calling
    // signInWithOtp() again, not the dedicated resend() endpoint (that one
    // is signup/email-change only — see register/page.tsx).
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (otpError) return { success: false, error: otpError.message };
    return { success: true };
  }

  async function handleVerify(token: string): Promise<OtpActionResult> {
    const supabase = createClient();
    // The only call in this entire flow that actually establishes a
    // session — nothing before this point could have.
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
          {step === "credentials" ? "Access your JMECPS account." : "Enter the verification code we sent you."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === "credentials" ? (
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-2 bg-primary text-primary-foreground hover:bg-primary/80">
              {isSubmitting ? "Verifying…" : "Continue"}
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
            onResend={handleResend}
            onChangeEmail={() => {
              setStep("credentials");
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
