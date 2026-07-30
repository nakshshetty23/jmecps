import "server-only";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
  region: process.env.AWS_SES_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY ?? "",
  },
});

const FROM_EMAIL = process.env.SES_FROM_EMAIL ?? "no-reply@jmecps.org";

async function sendEmail(to: string, subject: string, bodyText: string): Promise<void> {
  if (!to) return;
  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: { Text: { Data: bodyText } },
        },
      })
    );
  } catch (err) {
    // Email is a side effect of the submission pipeline, not a blocking
    // step — a misconfigured/unreachable SES account must never fail a
    // draft save or submission.
    console.error("SES send failed:", err);
  }
}

export function sendDraftCreatedEmail(to: string, title: string): Promise<void> {
  return sendEmail(
    to,
    "JMECPS — Draft manuscript created",
    `Your draft manuscript "${title || "Untitled"}" has been saved. You can continue editing it any time from your dashboard.`
  );
}

export function sendSubmissionConfirmationEmail(to: string, title: string, manuscriptCode: string): Promise<void> {
  return sendEmail(
    to,
    "JMECPS — Manuscript submission received",
    `Your manuscript "${title}" (${manuscriptCode}) has been submitted for review. You will be notified as its status changes.`
  );
}

const DECISION_COPY: Record<"APPROVED" | "REJECTED" | "REVISION_REQUIRED", string> = {
  APPROVED: "has been approved",
  REJECTED: "has been rejected",
  REVISION_REQUIRED: "requires revisions before it can proceed",
};

// authorNotes only — internal editor notes and reviewer identity must never
// reach this function's caller (see the "Author Isolation" requirement in
// the editorial workflow spec).
export function sendEditorialDecisionEmail(
  to: string,
  title: string,
  manuscriptCode: string,
  decision: "APPROVED" | "REJECTED" | "REVISION_REQUIRED",
  authorNotes: string,
  revisionDeadline?: Date | null
): Promise<void> {
  const lines = [
    `Your manuscript "${title}" (${manuscriptCode}) ${DECISION_COPY[decision]}.`,
    authorNotes ? `\nEditor feedback:\n${authorNotes}` : "",
    decision === "REVISION_REQUIRED" ? "\nYou can now edit and re-upload your manuscript from your dashboard." : "",
    decision === "REVISION_REQUIRED" && revisionDeadline
      ? `Please resubmit by ${revisionDeadline.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}.`
      : "",
  ].filter(Boolean);

  return sendEmail(to, `JMECPS — Decision on manuscript ${manuscriptCode}`, lines.join("\n"));
}
