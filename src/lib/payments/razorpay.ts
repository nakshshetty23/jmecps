import "server-only";
import crypto from "node:crypto";
import Razorpay from "razorpay";

// RAZORPAY_KEY_ID is not a secret (it's the public "key id" Razorpay's own
// checkout widget requires client-side — see initiatePaymentAction, which
// returns it to the browser deliberately) but is still read here, not via
// NEXT_PUBLIC_*, so it's only ever exposed through an explicit action
// return value, never baked into the client bundle at build time.
// RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET must never leave the server.
function getRazorpayEnv() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing).");
  }
  return { keyId, keySecret };
}

let client: Razorpay | null = null;
export function getRazorpayClient(): Razorpay {
  if (client) return client;
  const { keyId, keySecret } = getRazorpayEnv();
  client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

export function getRazorpayKeyId(): string {
  return getRazorpayEnv().keyId;
}

// Timing-safe comparison — a plain === on signatures would leak timing
// information about how many leading bytes matched.
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Used by the fast-path client-return verification (verifyPaymentAction) —
// Razorpay's documented scheme for the checkout `handler` callback:
// HMAC-SHA256("<order_id>|<payment_id>", key_secret).
export function verifyCheckoutSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = getRazorpayEnv();
  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return timingSafeEqual(expected, signature);
}

// Used by the webhook route — Razorpay signs the raw request body (not the
// parsed JSON) with a SEPARATE webhook secret (configured in the Razorpay
// dashboard, distinct from the API key secret above). Uses the SDK's own
// validator (Razorpay.validateWebhookSignature) rather than a hand-rolled
// comparison, since it's the vendor's maintained, timing-safe implementation.
export function verifyWebhookSignature({ rawBody, signature }: { rawBody: string; signature: string }): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Razorpay webhook secret is not configured (RAZORPAY_WEBHOOK_SECRET missing).");
  }
  return Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret);
}

// Razorpay's Orders API wants amounts in the smallest currency unit
// (paise for INR, cents for USD, etc.) — this app stores/displays the
// human amount (rupees), so this conversion is centralized here rather
// than duplicated at each call site. Assumes 2-decimal currencies, which
// covers INR/USD; revisit if a zero-decimal currency is ever configured.
export function toSmallestUnit(amount: number): number {
  return Math.round(amount * 100);
}
