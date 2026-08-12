"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { initiatePaymentAction, verifyPaymentAction } from "@/lib/actions/payment";
import type { ManuscriptStatus } from "@/generated/prisma/client";

interface PaymentPanelProps {
  manuscriptId: string;
  manuscriptTitle: string;
  status: ManuscriptStatus;
  isOwner: boolean;
  feeAmount: number;
  feeCurrency: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load payment checkout.")));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load payment checkout."));
    document.body.appendChild(script);
  });
}

// Only rendered for the manuscript's owner, and only for the statuses
// payment is actually relevant to — never for drafts, under-review,
// rejected, or already-published manuscripts (Part 12).
export default function PaymentPanel({ manuscriptId, manuscriptTitle, status, isOwner, feeAmount, feeCurrency }: PaymentPanelProps) {
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  if (!isOwner) return null;
  if (status !== "APPROVED" && status !== "PAYMENT_PENDING" && status !== "PAYMENT_COMPLETED") return null;

  async function handlePay() {
    setError(null);
    setPaying(true);
    try {
      const initiated = await initiatePaymentAction(manuscriptId);
      if (!initiated.success) {
        setError(initiated.error);
        return;
      }
      await loadCheckoutScript();
      if (!window.Razorpay) {
        setError("Could not load the payment checkout. Please try again.");
        return;
      }

      const { orderId, amount, currency, keyId } = initiated.data;
      const razorpay = new window.Razorpay({
        key: keyId,
        order_id: orderId,
        amount: Math.round(amount * 100),
        currency,
        name: "JMECPS",
        description: `Publication fee — ${manuscriptTitle}`,
        // This callback is informational only, never trusted as proof of
        // payment — verifyPaymentAction independently re-derives ownership
        // and re-computes the signature server-side before anything
        // changes. The webhook is the authoritative path regardless of
        // whether this callback ever fires (e.g. the browser tab closing
        // mid-redirect for a UPI app switch).
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setVerifying(true);
          try {
            const result = await verifyPaymentAction({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            if (!result.success) {
              setError(result.errors?._form?.[0] ?? "Payment could not be verified. If money was deducted, it will still be reconciled automatically.");
              return;
            }
            router.refresh();
          } finally {
            setVerifying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment process.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <Card className="card-terminal">
      <CardHeader>
        <CardTitle className="heading-display text-lg text-primary">Publication Fee</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status === "PAYMENT_COMPLETED" ? (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            Payment received. Awaiting publication.
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              This manuscript has been approved. A publication fee is required before it can be published.
            </p>
            <p className="font-mono text-2xl text-primary">
              {feeCurrency} {feeAmount.toFixed(2)}
            </p>
            {feeAmount <= 0 ? (
              <p className="text-sm text-muted-foreground">
                The publication fee has not been configured yet. Please contact the journal.
              </p>
            ) : (
              <Button type="button" disabled={paying || verifying} onClick={handlePay} className="self-start">
                {verifying ? "Verifying…" : paying ? "Opening checkout…" : "Pay Publication Fee"}
              </Button>
            )}
          </>
        )}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
