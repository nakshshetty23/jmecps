import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature, toSmallestUnit } from "@/lib/payments/razorpay";
import { applyVerifiedPayment } from "@/lib/payments/apply-payment";
import { logAuditEvent } from "@/lib/audit/logger";

// A trusted machine-to-machine endpoint, not a user-facing route — it
// authenticates via the Razorpay webhook signature (RAZORPAY_WEBHOOK_SECRET),
// never a Supabase session. Exempted from Phase 2's default-authenticated
// routing in src/lib/auth/rbac.ts (a single exact-path exception, not a
// broad /api/* carve-out) — see that file's PUBLIC_EXACT_PATHS comment.

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
}

interface RazorpayWebhookEvent {
  event: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
  };
}

function isRazorpayWebhookEvent(value: unknown): value is RazorpayWebhookEvent {
  return typeof value === "object" && value !== null && typeof (value as { event?: unknown }).event === "string";
}

function isPaymentEntity(value: unknown): value is RazorpayPaymentEntity {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.order_id === "string" && typeof v.amount === "number" && typeof v.currency === "string";
}

// Real Razorpay webhook payloads are a few KB at most. Unlike Server
// Actions (Next.js enforces a 1MB default body limit on those), a raw
// Route Handler has no built-in cap — request.text() would otherwise
// buffer an arbitrarily large body into memory before signature
// verification ever runs. Content-Length is attacker-controllable (it can
// be omitted or lied about under chunked encoding), so this is a
// best-effort early rejection, not a hard guarantee — but it stops the
// common case cheaply, before any buffering happens.
const MAX_WEBHOOK_BODY_BYTES = 256 * 1024;

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  // Signature verification requires the exact raw bytes Razorpay signed —
  // must be read before any JSON parsing, which would otherwise normalize
  // whitespace/key order and break the HMAC comparison.
  const rawBody = await request.text();
  if (rawBody.length > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let validSignature: boolean;
  try {
    validSignature = verifyWebhookSignature({ rawBody, signature });
  } catch (err) {
    // Misconfiguration (missing RAZORPAY_WEBHOOK_SECRET), not a client
    // error — log server-side, don't leak details to the caller.
    console.error("Razorpay webhook verification is not configured:", err);
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }
  if (!validSignature) {
    await logAuditEvent({
      userId: null,
      action: "payment.verification_failed",
      resourceId: null,
      metadata: { reason: "invalid_webhook_signature" },
    });
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }
  if (!isRazorpayWebhookEvent(parsed)) {
    return NextResponse.json({ error: "Unrecognized payload." }, { status: 400 });
  }
  const event = parsed;

  await logAuditEvent({
    userId: null,
    action: "payment.webhook_received",
    resourceId: null,
    metadata: { event: event.event },
  });

  const paymentEntity = event.payload?.payment?.entity;

  if (event.event === "payment.failed") {
    if (isPaymentEntity(paymentEntity)) {
      const payment = await db.payment.findUnique({ where: { transaction_ref: paymentEntity.order_id } });
      if (payment && payment.status === "PENDING") {
        await db.payment.updateMany({
          where: { id: payment.id, status: "PENDING" },
          data: {
            status: "FAILED",
            gateway_log: {
              ...((payment.gateway_log ?? {}) as Record<string, unknown>),
              razorpay_payment_id: paymentEntity.id,
              failedAt: new Date().toISOString(),
            },
          },
        });
        await logAuditEvent({
          userId: null,
          action: "payment.failed",
          resourceId: payment.manuscript_id,
          metadata: { orderId: paymentEntity.order_id, paymentId: paymentEntity.id },
        });
      }
    }
    return NextResponse.json({ received: true });
  }

  if (event.event !== "payment.captured" && event.event !== "order.paid") {
    // Acknowledged but not acted on (e.g. payment.authorized before
    // capture) — returning 200 stops Razorpay from retrying an event this
    // app has no handling for.
    return NextResponse.json({ received: true });
  }

  if (!isPaymentEntity(paymentEntity)) {
    return NextResponse.json({ error: "Malformed payment payload." }, { status: 400 });
  }

  const payment = await db.payment.findUnique({ where: { transaction_ref: paymentEntity.order_id } });
  if (!payment) {
    // Unknown order — acknowledge rather than error, so Razorpay doesn't
    // retry indefinitely for an order this app will never be able to match.
    return NextResponse.json({ received: true, note: "Unknown order." });
  }

  // Never trust the webhook's claimed amount/currency at face value —
  // cross-check against what this app itself recorded when the order was
  // created (initiatePaymentAction), from the server-side fee configuration.
  const expectedAmount = toSmallestUnit(Number(payment.amount));
  if (paymentEntity.amount !== expectedAmount || paymentEntity.currency !== payment.currency) {
    await logAuditEvent({
      userId: null,
      action: "payment.verification_failed",
      resourceId: payment.manuscript_id,
      metadata: { reason: "amount_or_currency_mismatch", orderId: paymentEntity.order_id },
    });
    return NextResponse.json({ error: "Amount or currency mismatch." }, { status: 400 });
  }

  await applyVerifiedPayment({ payment, gatewayPaymentId: paymentEntity.id, verifiedVia: "webhook" });

  await logAuditEvent({
    userId: null,
    action: "payment.verified",
    resourceId: payment.manuscript_id,
    metadata: { orderId: paymentEntity.order_id, paymentId: paymentEntity.id, via: "webhook" },
  });

  return NextResponse.json({ received: true });
}
