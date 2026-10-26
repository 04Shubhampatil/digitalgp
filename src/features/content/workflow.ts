import type { ContentStatus } from "@/generated/prisma/enums";
import { Errors } from "@/lib/errors";
import type { Capability } from "@/lib/permissions";

/**
 * Content lifecycle shared by announcements, schemes, projects and page sections:
 *
 *   DRAFT --submit--> SUBMITTED --start_review--> UNDER_REVIEW --approve--> APPROVED --publish--> PUBLISHED --archive--> ARCHIVED
 *     ^                  |                            |                        |
 *     +------------------+------- reject (note) ------+------------------------+   REJECTED --(edit or submit)--> DRAFT / SUBMITTED
 *
 * Publishing is a separate capability from reviewing. Editing a REJECTED item returns it to DRAFT.
 */
export type WorkflowAction = "submit" | "start_review" | "approve" | "reject" | "publish" | "unpublish" | "archive";

interface Transition {
  from: readonly ContentStatus[];
  to: ContentStatus;
  capability: Capability;
  requiresNote?: boolean;
}

export const TRANSITIONS: Readonly<Record<WorkflowAction, Transition>> = {
  submit: { from: ["DRAFT", "REJECTED"], to: "SUBMITTED", capability: "content:submit" },
  start_review: { from: ["SUBMITTED"], to: "UNDER_REVIEW", capability: "content:review" },
  approve: { from: ["SUBMITTED", "UNDER_REVIEW"], to: "APPROVED", capability: "content:review" },
  reject: { from: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"], to: "REJECTED", capability: "content:review", requiresNote: true },
  publish: { from: ["APPROVED"], to: "PUBLISHED", capability: "content:publish" },
  unpublish: { from: ["PUBLISHED"], to: "APPROVED", capability: "content:publish" },
  archive: { from: ["PUBLISHED", "APPROVED", "REJECTED", "DRAFT"], to: "ARCHIVED", capability: "content:publish" },
};

export const EDITABLE_STATUSES: readonly ContentStatus[] = ["DRAFT", "REJECTED"];

export function isWorkflowAction(value: string): value is WorkflowAction {
  return value in TRANSITIONS;
}

/** Resolve the next status or throw INVALID_TRANSITION (409). */
export function nextStatus(current: ContentStatus, action: WorkflowAction, note?: string | null): ContentStatus {
  const t = TRANSITIONS[action];
  if (!t.from.includes(current)) throw Errors.invalidTransition(current, t.to);
  if (t.requiresNote && !note?.trim()) throw Errors.badRequest("A note explaining the rejection is required");
  return t.to;
}

export function transitionCapability(action: WorkflowAction): Capability {
  return TRANSITIONS[action].capability;
}

export function assertEditable(status: ContentStatus) {
  if (!EDITABLE_STATUSES.includes(status)) {
    throw Errors.conflict(`Content in status ${status} cannot be edited; it must be in DRAFT or REJECTED`);
  }
}
