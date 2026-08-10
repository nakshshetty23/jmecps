"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { otpSchema } from "@/lib/validations/auth";

const RESEND_COOLDOWN_SECONDS = 60;

export interface OtpActionResult {
  success: boolean;
  error?: string;
}

interface OtpVerifyStepProps {
  email: string;
  /** Runs the actual supabase.auth.verifyOtp call and any post-success work (redirect, etc). */
  onVerify: (token: string) => Promise<OtpActionResult>;
  /** Re-sends the code via the same signInWithOtp call that got the user here. */
  onResend: () => Promise<OtpActionResult>;
  /** Goes back to the email/info step so the user can fix a typo before requesting another code. */
  onChangeEmail: () => void;
}

// Shared by the register and login pages — both converge on the identical
// "enter the 6-digit code Supabase emailed you" step once signInWithOtp has
// been called; they only differ in what onVerify/onResend actually do
// (verifyOtp + redirect target differ, but the OTP UI/countdown mechanics
// are the same).
export default function OtpVerifyStep({ email, onVerify, onResend, onChangeEmail }: OtpVerifyStepProps) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResendMessage(null);

    const parsed = otpSchema.safeParse({ token });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setIsVerifying(true);
    try {
      const result = await onVerify(parsed.data.token);
      if (!result.success) {
        setError(result.error ?? "Invalid or expired code. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || isResending) return;
    setError(null);
    setResendMessage(null);
    setIsResending(true);
    try {
      const result = await onResend();
      if (result.success) {
        setResendMessage("A new code has been sent.");
        setToken("");
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setError(result.error ?? "Could not resend the code. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <form onSubmit={handleVerify} className="flex flex-col gap-4">
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Verification code sent to <span className="font-medium text-foreground">{email}</span>.{" "}
        <button
          type="button"
          onClick={onChangeEmail}
          className="text-accent hover:underline"
        >
          Change email
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {resendMessage && !error && (
        <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
          {resendMessage}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="otp">6-digit code</Label>
        <Input
          id="otp"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="text-center text-lg tracking-[0.5em] font-mono"
          placeholder="000000"
          autoFocus
        />
      </div>

      <Button type="submit" disabled={isVerifying || token.length !== 6} className="bg-primary text-primary-foreground hover:bg-primary/80">
        {isVerifying ? "Verifying…" : "Verify Code"}
      </Button>

      <Button
        type="button"
        variant="outline"
        disabled={cooldown > 0 || isResending}
        onClick={handleResend}
      >
        {isResending ? "Resending…" : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend Code"}
      </Button>
    </form>
  );
}
