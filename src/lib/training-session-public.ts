/** Statuses that never allow self-service signup or a waitlist (portal). `draft` is hidden from customers. */
const NO_SIGNUP_STATUSES = new Set(["draft", "closed", "cancelled"]);

/** Statuses where the waitlist may be offered when `waitlist_enabled` is on. */
const WAITLIST_STATUSES = new Set(["open", "full"]);

function normalizeStatus(status: string): string {
  return String(status).toLowerCase();
}

/**
 * True when the waitlist may be offered for this status/setting. Never true for closed, cancelled or draft,
 * even when `waitlist_enabled` is on.
 */
export function isTrainingSessionWaitlistAllowed(
  status: string,
  waitlistEnabled: boolean | null | undefined
): boolean {
  return waitlistEnabled === true && WAITLIST_STATUSES.has(normalizeStatus(status));
}

/**
 * True when the status alone blocks self-service signup: closed, cancelled and draft always;
 * `full` only when the waitlist is not available for it.
 */
export function isTrainingSessionSignupBlockedByStatus(
  status: string,
  waitlistEnabled: boolean | null | undefined
): boolean {
  const normalized = normalizeStatus(status);
  if (NO_SIGNUP_STATUSES.has(normalized)) return true;
  if (normalized === "full") return !isTrainingSessionWaitlistAllowed(normalized, waitlistEnabled);
  return false;
}

export function isTrainingRegistrationWindowClosed(
  registrationClosesAt: string | null | undefined
): boolean {
  if (!registrationClosesAt?.trim()) return false;
  return new Date(registrationClosesAt).getTime() <= Date.now();
}

/** True when the learner should not be able to sign up or join the waitlist. */
export function trainingSessionCannotSelfServeSignup(
  status: string,
  registrationClosesAt: string | null | undefined,
  waitlistEnabled: boolean | null | undefined
): boolean {
  return (
    isTrainingSessionSignupBlockedByStatus(status, waitlistEnabled) ||
    isTrainingRegistrationWindowClosed(registrationClosesAt)
  );
}

/** True when the customer-facing UI should offer "join waitlist" instead of a normal signup. */
export function trainingSessionOffersWaitlist(session: {
  status: string;
  waitlist_enabled: boolean | null | undefined;
  spots_remaining: number;
  registration_closes_at?: string | null;
}): boolean {
  return (
    session.spots_remaining <= 0 &&
    isTrainingSessionWaitlistAllowed(session.status, session.waitlist_enabled) &&
    !isTrainingRegistrationWindowClosed(session.registration_closes_at)
  );
}

/** Badge shown next to a class title: full, closed and cancelled (full stays visible when the waitlist is offered). */
export function shouldShowTrainingSessionStatusBadge(status: string): boolean {
  const normalized = normalizeStatus(status);
  return normalized === "full" || normalized === "closed" || normalized === "cancelled";
}

/** Short label for badges on the customer portal. */
export function publicTrainingSessionStatusLabel(status: string): string {
  switch (String(status).toLowerCase()) {
    case "full":
      return "Full";
    case "closed":
      return "Closed";
    case "cancelled":
      return "Cancelled";
    case "open":
      return "Open";
    default:
      return status;
  }
}
