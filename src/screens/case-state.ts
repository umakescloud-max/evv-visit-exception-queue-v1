import { useSyncExternalStore } from "react";

// In-memory coordinator work on visit #41882. Deliberately not persisted:
// a reload returns to the untouched record, which is what the gate expects.
export type ReviewDecision = "waiting" | "approved" | "returned";

export interface CaseState {
  /** The family's written confirmation has been attached in Exceptions. */
  attached: boolean;
  /** The visit has been sent from Exceptions to the billing review queue. */
  inBillingReview: boolean;
  /** What Marisol decided in the billing review queue. */
  decision: ReviewDecision;
}

let state: CaseState = { attached: false, inBillingReview: false, decision: "waiting" };
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CaseState {
  return state;
}

export function useCaseState(): CaseState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function markDocumentAttached(): void {
  if (state.attached) return;
  state = { ...state, attached: true };
  emit();
}

/**
 * Sending the visit to billing review always puts it back in front of the
 * coordinator as waiting for approval, including a re-send after it was
 * returned for more information.
 */
export function sendToBillingReview(): void {
  state = { attached: state.attached, inBillingReview: true, decision: "waiting" };
  emit();
}

export function recordDecision(decision: Exclude<ReviewDecision, "waiting">): void {
  state = { ...state, inBillingReview: false, decision };
  emit();
}
