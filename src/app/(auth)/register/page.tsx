"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { getDashboardPath, type Role } from "@/lib/auth/rbac";
import { recordRegisterAction } from "@/lib/actions/auth-events";
import { registerSchema } from "@/lib/validations/auth";
import OtpVerifyStep, { type OtpActionResult } from "@/components/auth/OtpVerifyStep";

type Step = "info" | "otp";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [institutionalAffiliation, setInstitutionalAffiliation] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({
      fullName,
      email,
      institutionalAffiliation,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setFullName(parsed.data.fullName);
    setEmail(parsed.data.email);
    setInstitutionalAffiliation(parsed.data.institutionalAffiliation);

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      // With "Confirm email" enabled on this project, signUp() creates the
      // account but withholds a session (data.session is null) until the
      // OTP below is verified — the account exists but isn't usable yet.
      const { error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            full_name: parsed.data.fullName,
            institutional_affiliation: parsed.data.institutionalAffiliation,
          },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
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
    // Dedicated resend endpoint for signup confirmations — distinct from
    // signInWithOtp, which is for the (passwordless) OTP-login flow instead.
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    if (resendError) return { success: false, error: resendError.message };
    return { success: true };
  }

  async function handleVerify(token: string): Promise<OtpActionResult> {
    const supabase = createClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });
    if (verifyError) return { success: false, error: verifyError.message };

    void recordRegisterAction();

    const role = data.user?.app_metadata?.role as Role | undefined;
    router.push(getDashboardPath(role ?? "RESEARCHER"));
    router.refresh();
    return { success: true };
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="heading-display text-2xl text-primary">Create Account</CardTitle>
          <CardDescription>
            {step === "info" ? "Register as a researcher on JMECPS." : "Enter the code we sent you."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "info" ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

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
                <Label htmlFor="institutional_affiliation">Institutional Affiliation</Label>
                <Input
                  id="institutional_affiliation"
                  name="institutional_affiliation"
                  type="text"
                  required
                  value={institutionalAffiliation}
                  onChange={(e) => setInstitutionalAffiliation(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
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
                <Label htmlFor="confirm_password">Confirm Password</Label>
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

              <Button type="submit" disabled={isSubmitting} className="mt-2 bg-primary text-primary-foreground hover:bg-primary/80">
                {isSubmitting ? "Creating account…" : "Create Account"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-accent hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          ) : (
            <OtpVerifyStep
              email={email}
              onVerify={handleVerify}
              onResend={handleResend}
              onChangeEmail={() => {
                setStep("info");
                setError(null);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
