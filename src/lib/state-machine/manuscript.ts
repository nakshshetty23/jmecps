import type { ManuscriptStatus } from "@/generated/prisma/client";

// RESEARCHER = "Author", ADMIN = "Editor / Managing Editor" (SUPER_ADMIN is
// universal across both, per this codebase's domain-bounded RBAC design —
// see src/lib/auth/rbac.ts). SYSTEM is a pseudo-actor for webhook-triggered
// transitions with no human session behind them.
export type Actor = "RESEARCHER" | "ADMIN" | "SUPER_ADMIN" | "SYSTEM";

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly from: ManuscriptStatus,
    public readonly to: ManuscriptStatus
  ) {
    super(`Invalid state transition: ${from} -> ${to} is not a valid edge in the manuscript lifecycle graph.`);
    this.name = "InvalidStateTransitionError";
  }
}

export class UnauthorizedTransitionError extends Error {
  constructor(
    public readonly from: ManuscriptStatus,
    public readonly to: ManuscriptStatus,
    public readonly actor: Actor
  ) {
    super(`Role "${actor}" is not permitted to transition a manuscript from ${from} to ${to}.`);
    this.name = "UnauthorizedTransitionError";
  }
}

// The state graph. This is the single source of truth for which transitions
// exist at all — role permissions below can only narrow this set, never
// widen it. Anything not listed here is graph-invalid regardless of actor.
const TRANSITIONS: Record<ManuscriptStatus, ManuscriptStatus[]> = {
  DRAFT: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "WITHDRAWN"],
  UNDER_REVIEW: ["REVISION_REQUIRED", "APPROVED", "REJECTED", "WITHDRAWN"],
  REVISION_REQUIRED: ["RESUBMITTED", "WITHDRAWN"],
  // The task spec's prose ("Withdraw: * -> WITHDRAWN") disagrees with its own
  // transition matrix, which never lists RESUBMITTED -> WITHDRAWN. The matrix
  // is the explicitly-enforced source of truth, so it wins: an author cannot
  // withdraw a resubmitted manuscript once it's back under review.
  RESUBMITTED: ["UNDER_REVIEW", "APPROVED", "REJECTED"],
  // APPROVED -> PUBLISHED is deliberately NOT an edge: publication must
  // always pass through payment (PAYMENT_PENDING -> PAYMENT_COMPLETED)
  // first, never directly from an approved-but-unpaid manuscript.
  APPROVED: ["PAYMENT_PENDING"],
  PAYMENT_PENDING: ["PAYMENT_COMPLETED"],
  PAYMENT_COMPLETED: ["PUBLISHED"],
  PUBLISHED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

type TransitionKey = `${ManuscriptStatus}->${ManuscriptStatus}`;

function key(from: ManuscriptStatus, to: ManuscriptStatus): TransitionKey {
  return `${from}->${to}`;
}

const AUTHOR_TRANSITIONS = new Set<TransitionKey>([
  key("DRAFT", "SUBMITTED"),
  key("REVISION_REQUIRED", "RESUBMITTED"),
  key("DRAFT", "WITHDRAWN"),
  key("SUBMITTED", "WITHDRAWN"),
  key("UNDER_REVIEW", "WITHDRAWN"),
  key("REVISION_REQUIRED", "WITHDRAWN"),
]);

const EDITOR_TRANSITIONS = new Set<TransitionKey>([
  key("SUBMITTED", "UNDER_REVIEW"),
  key("RESUBMITTED", "UNDER_REVIEW"),
  key("UNDER_REVIEW", "REVISION_REQUIRED"),
  key("UNDER_REVIEW", "APPROVED"),
  key("UNDER_REVIEW", "REJECTED"),
  key("RESUBMITTED", "APPROVED"),
  key("RESUBMITTED", "REJECTED"),
  key("SUBMITTED", "REJECTED"),
  key("PAYMENT_COMPLETED", "PUBLISHED"),
]);

const SYSTEM_TRANSITIONS = new Set<TransitionKey>([
  key("APPROVED", "PAYMENT_PENDING"),
  key("PAYMENT_PENDING", "PAYMENT_COMPLETED"),
]);

function isPermittedForActor(from: ManuscriptStatus, to: ManuscriptStatus, actor: Actor): boolean {
  const k = key(from, to);
  switch (actor) {
    case "RESEARCHER":
      return AUTHOR_TRANSITIONS.has(k);
    case "ADMIN":
      return EDITOR_TRANSITIONS.has(k);
    case "SYSTEM":
      return SYSTEM_TRANSITIONS.has(k);
    case "SUPER_ADMIN":
      // Universal, per this codebase's RBAC design (SUPER_ADMIN outranks
      // every domain-bounded role) — editor actions plus the ability to
      // manually complete a payment transition if a webhook fails.
      return EDITOR_TRANSITIONS.has(k) || SYSTEM_TRANSITIONS.has(k);
    default:
      return false;
  }
}

export function assertTransition(current: ManuscriptStatus, target: ManuscriptStatus, actor: Actor): void {
  if (!TRANSITIONS[current]?.includes(target)) {
    throw new InvalidStateTransitionError(current, target);
  }
  if (!isPermittedForActor(current, target, actor)) {
    throw new UnauthorizedTransitionError(current, target, actor);
  }
}

export function canTransition(current: ManuscriptStatus, target: ManuscriptStatus, actor: Actor): boolean {
  try {
    assertTransition(current, target, actor);
    return true;
  } catch {
    return false;
  }
}

export function getNextAllowedStates(current: ManuscriptStatus, actor: Actor): ManuscriptStatus[] {
  return TRANSITIONS[current].filter((target) => isPermittedForActor(current, target, actor));
}

export const TERMINAL_STATES: ManuscriptStatus[] = ["PUBLISHED", "REJECTED", "WITHDRAWN"];

export function isTerminalState(status: ManuscriptStatus): boolean {
  return TERMINAL_STATES.includes(status);
}
