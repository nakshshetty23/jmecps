"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getJournalSettings } from "@/lib/journal-settings";
import { assertTransition, InvalidStateTransitionError, UnauthorizedTransitionError } from "@/lib/state-machine/manuscript";
import { getRazorpayClient, getRazorpayKeyId, toSmallestUnit, verifyCheckoutSignature } from "@/lib/payments/razorpay";
import { applyVerifiedPayment } from "@/lib/payments/apply-payment";
import { logAuditEvent } from "@/lib/audit/logger";
import type { ActionResult } from "./submission";

export type InitiatePaymentResult =
  | {
      success: true;
      data: { orderId: string; amount: number; currency: string; keyId: string; manuscriptTitle: string };
    }
  | { success: false; error: string };

// Only the manuscript's primary author may pay for it — the same
// ownership model every other manuscript action (upload, download,
// finalize-submission) already uses; see src/lib/actions/upload.ts's
// getOwnedDraftManuscript for the precedent. Co-authors are not payers
// (nothing in the existing app treats them as owners), and SUPER_ADMIN
// doesn't initiate gateway payments on a researcher's behalf — they have
// the separate manual/offline path (markPaymentReceivedAction).
export async function initiatePaymentAction(manuscriptId: string): Promise<InitiatePaymentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You must be signed in to make a payment." };

  const manuscript = await db.manuscript.findUnique({ where: { id: manuscriptId } });
  if (!manuscript) return { success: false, error: "Manuscript not found." };

  if (manuscript.primary_author_id !== user.id) {
    return { success: false, error: "Only the manuscript's submitting author can pay its publication fee." };
  }
  if (manuscript.status !== "APPROVED" && manuscript.status !== "PAYMENT_PENDING") {
    return { success: false, error: "This manuscript is not awaiting payment." };
  }

  // The fee is always read fresh from server-side config — never accepted
  // from the client — so a researcher can't influence what they're charged.
  const settings = await getJournalSettings();
  const feeAmount = Number(settings.publication_fee_amount);
  const feeCurrency = settings.publication_fee_currency;
  if (feeAmount <= 0) {
    return { success: false, error: "The publication fee has not been configured yet. Please contact the journal." };
  }

  // Reuse an existing PENDING order rather than minting a new one on every
  // page load/refresh (Part 22 test 9: duplicate payment attempts handled
  // safely) — but only if it still matches the currently-configured fee;
  // if a Super Admin changed the price since this order was created, don't
  // hand out a stale amount.
  const existingPending = await db.payment.findFirst({
    where: { manuscript_id: manuscriptId, status: "PENDING" },
    orderBy: { created_at: "desc" },
  });
  if (existingPending && Number(existingPending.amount) === feeAmount && existingPending.currency === feeCurrency) {
    return {
      success: true,
      data: { orderId: existingPending.transaction_ref, amount: feeAmount, currency: feeCurrency, keyId: getRazorpayKeyId(), manuscriptTitle: manuscript.title },
    };
  }

  if (manuscript.status === "APPROVED") {
    // "Researcher initiates payment" is what actually starts the payment
    // process — this is when APPROVED genuinely becomes PAYMENT_PENDING,
    // matching the required flow's ordering. Uses the SYSTEM actor
    // (already a valid, existing edge in the state machine — see
    // SYSTEM_TRANSITIONS in src/lib/state-machine/manuscript.ts) since
    // this is an automated process step, not an editorial decision; the
    // audit trail still records the real user as the actor.
    try {
      assertTransition("APPROVED", "PAYMENT_PENDING", "SYSTEM");
    } catch (err) {
      if (err instanceof InvalidStateTransitionError || err instanceof UnauthorizedTransitionError) {
        return { success: false, error: "This manuscript cannot start payment right now." };
      }
      throw err;
    }
    const step = await db.manuscript.updateMany({
      where: { id: manuscriptId, status: "APPROVED" },
      data: { status: "PAYMENT_PENDING" },
    });
    if (step.count === 0) {
      return { success: false, error: "This manuscript's status changed. Please refresh and try again." };
    }
    await db.manuscriptAuditLog.create({
      data: { manuscript_id: manuscriptId, from_state: "APPROVED", to_state: "PAYMENT_PENDING", actor_id: user.id },
    });
    await logAuditEvent({
      userId: user.id,
      action: "manuscript.transition",
      resourceId: manuscriptId,
      metadata: { from: "APPROVED", to: "PAYMENT_PENDING" },
    });
  }

  let order;
  try {
    const razorpay = getRazorpayClient();
    order = await razorpay.orders.create({
      amount: toSmallestUnit(feeAmount),
      currency: feeCurrency,
      receipt: manuscriptId,
      notes: { manuscriptId, userId: user.id },
    });
  } catch (err) {
    console.error("Razorpay order creation failed:", err);
    return { success: false, error: "Could not start the payment process. Please try again shortly." };
  }

  await db.payment.create({
    data: {
      transaction_ref: order.id,
      manuscript_id: manuscriptId,
      amount: feeAmount,
      currency: feeCurrency,
      gateway_log: { gateway: "razorpay", razorpay_order_id: order.id, initiatedBy: user.id },
      status: "PENDING",
    },
  });

  await logAuditEvent({
    userId: user.id,
    action: "payment.initiated",
    resourceId: manuscriptId,
    metadata: { orderId: order.id, amount: feeAmount, currency: feeCurrency },
  });

  return {
    success: true,
    data: { orderId: order.id, amount: feeAmount, currency: feeCurrency, keyId: getRazorpayKeyId(), manuscriptTitle: manuscript.title },
  };
}

// Fast client-return path — called right after Razorpay's checkout
// `handler` callback fires in the browser. This is NEVER trusted on its
// own: it independently re-verifies ownership server-side and computes
// the HMAC signature itself (verifyCheckoutSignature, using the server-
// only key secret), rather than trusting the client's claim that payment
// succeeded. The webhook (src/app/api/webhooks/razorpay/route.ts) is the
// authoritative path and can arrive before or after this — both converge
// on the same idempotent applyVerifiedPayment, so whichever runs first wins.
export async function verifyPaymentAction({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<ActionResult<{ manuscriptId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, errors: { _form: ["You must be signed in."] } };

  const payment = await db.payment.findUnique({ where: { transaction_ref: orderId } });
  if (!payment) return { success: false, errors: { _form: ["Payment record not found."] } };

  const manuscript = await db.manuscript.findUnique({ where: { id: payment.manuscript_id } });
  if (!manuscript) return { success: false, errors: { _form: ["Manuscript not found."] } };

  if (manuscript.primary_author_id !== user.id) {
    return { success: false, errors: { _form: ["You are not authorized to verify this payment."] } };
  }

  if (payment.status === "COMPLETED") {
    // Already confirmed — most likely the webhook won the race. Idempotent
    // success, not an error.
    return { success: true, data: { manuscriptId: manuscript.id } };
  }
  if (payment.status !== "PENDING") {
    return { success: false, errors: { _form: ["This payment is no longer pending."] } };
  }

  const validSignature = verifyCheckoutSignature({ orderId, paymentId, signature });
  if (!validSignature) {
    await logAuditEvent({
      userId: user.id,
      action: "payment.verification_failed",
      resourceId: manuscript.id,
      metadata: { orderId, reason: "invalid_signature" },
    });
    return { success: false, errors: { _form: ["Payment verification failed."] } };
  }

  await applyVerifiedPayment({ payment, gatewayPaymentId: paymentId, verifiedVia: "checkout_callback" });

  await logAuditEvent({
    userId: user.id,
    action: "payment.verified",
    resourceId: manuscript.id,
    metadata: { orderId, paymentId, via: "checkout_callback" },
  });

  return { success: true, data: { manuscriptId: manuscript.id } };
}
