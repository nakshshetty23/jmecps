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
import { registerInfoSchema } from "@/lib/validations/auth";
import OtpVerifyStep, { type OtpActionResult } from "@/components/auth/OtpVerifyStep";

type Step = "info" | "otp";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("info");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [institutionalAffiliation, setInstitutionalAffiliation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Takes explicit values rather than reading component state directly —
  // handleSubmit calls this with freshly-parsed data in the same tick as
  // its setState calls, before those updates have actually landed, so
  // reading `email`/`fullName`/etc. here instead would race against
  // React's batching. The resend button (which does read current state)
  // is only reachable after the "otp" step has rendered, well past that
  // window, so it's safe there.
  async function sendOtp(values: { email: string; fullName: string; institutionalAffiliation: string }): Promise<OtpActionResult> {
    const supabase = createClient();
    // shouldCreateUser: true — this is the account-creation call. If the
    // email already has an account, Supabase sends a login code instead of
    // erroring (deliberate anti-enumeration behavior on Supabase's part —
    // signup can't be used to probe which emails are already registered).
    // Either way the next step is identical: enter the code that arrived.
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: values.fullName,
          institutional_affiliation: values.institutionalAffiliation,
        },
      },
    });
    if (otpError) return { success: false, error: otpError.message };
    return { success: true };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = registerInfoSchema.safeParse({ fullName, email, institutionalAffiliation });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setFullName(parsed.data.fullName);
    setEmail(parsed.data.email);
    setInstitutionalAffiliation(parsed.data.institutionalAffiliation);

    setIsSubmitting(true);
    try {
      const result = await sendOtp(parsed.data);
      if (!result.success) {
        setError(result.error ?? "Could not send the verification code. Please try again.");
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

              <Button type="submit" disabled={isSubmitting} className="mt-2 bg-primary text-primary-foreground hover:bg-primary/80">
                {isSubmitting ? "Sending code…" : "Create Account"}
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
              onResend={() => sendOtp({ email, fullName, institutionalAffiliation })}
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
