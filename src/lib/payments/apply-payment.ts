import "server-only";
import { db } from "@/lib/db";
import { assertTransition } from "@/lib/state-machine/manuscript";
import { logAuditEvent } from "@/lib/audit/logger";
import type { Payment } from "@/generated/prisma/client";

// Shared by verifyPaymentAction (the fast client-return path) and the
// Razorpay webhook — both can legitimately race to confirm the same
// payment (browser callback vs. async webhook delivery), so this is the
// single place that actually flips PENDING -> COMPLETED and advances the
// manuscript, guaranteeing it happens at most once regardless of how many
// times either caller invokes it.
//
// Returns true if THIS call was the one that applied the change, false if
// it was already applied (a safe, idempotent no-op — not an error).
export async function applyVerifiedPayment({
  payment,
  gatewayPaymentId,
  verifiedVia,
}: {
  payment: Payment;
  gatewayPaymentId: string;
  verifiedVia: "checkout_callback" | "webhook";
}): Promise<boolean> {
  const existingLog = (payment.gateway_log ?? {}) as Record<string, unknown>;

  // Atomic compare-and-swap via the WHERE clause, not an in-memory check —
  // whichever of a concurrent webhook/checkout-callback pair gets here
  // first wins; the other sees count === 0 and stops, so a late/duplicate
  // event can never re-run the manuscript transition below.
  const updated = await db.payment.updateMany({
    where: { id: payment.id, status: "PENDING" },
    data: {
      status: "COMPLETED",
      gateway_log: {
        ...existingLog,
        razorpay_payment_id: gatewayPaymentId,
        verifiedVia,
        verifiedAt: new Date().toISOString(),
      },
    },
  });
  if (updated.count === 0) return false;

  try {
    assertTransition("PAYMENT_PENDING", "PAYMENT_COMPLETED", "SYSTEM");
  } catch {
    // Graph says this edge shouldn't exist — leave the manuscript status
    // alone; the Payment row is still correctly marked COMPLETED above.
    return true;
  }

  const transitioned = await db.manuscript.updateMany({
    where: { id: payment.manuscript_id, status: "PAYMENT_PENDING" },
    data: { status: "PAYMENT_COMPLETED" },
  });

  if (transitioned.count > 0) {
    await db.manuscriptAuditLog.create({
      data: {
        manuscript_id: payment.manuscript_id,
        from_state: "PAYMENT_PENDING",
        to_state: "PAYMENT_COMPLETED",
        actor_id: null,
      },
    });
    await logAuditEvent({
      userId: null,
      action: "manuscript.transition",
      resourceId: payment.manuscript_id,
      metadata: { from: "PAYMENT_PENDING", to: "PAYMENT_COMPLETED", via: verifiedVia },
    });
  }

  return true;
}
