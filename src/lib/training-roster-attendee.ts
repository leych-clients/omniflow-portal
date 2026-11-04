/** Helpers for showing signup-form attendee details next to the submitting account on the admin roster. */

export type RosterAttendeeFields = {
  first_name?: string | null;
  last_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  certificate_company_name?: string | null;
};

export type RosterAccount = {
  email?: string | null;
  name?: string | null;
};

function clean(s: string | null | undefined): string {
  return (s ?? "").trim();
}

/** First + last name typed on the signup form, or null when neither was saved. */
export function attendeeDisplayName(r: RosterAttendeeFields): string | null {
  const name = [clean(r.first_name), clean(r.last_name)].filter(Boolean).join(" ");
  return name || null;
}

/**
 * False for registrations without form details (admin-added, or the details save failed),
 * where every enrollment column is null/blank.
 */
export function hasSignupDetails(r: RosterAttendeeFields): boolean {
  return [r.first_name, r.last_name, r.contact_email, r.contact_phone, r.certificate_company_name].some(
    (v) => clean(v) !== ""
  );
}

function nameTokens(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Same person if one name's words are all contained in the other's (e.g. "Jane Doe" vs "Jane Q. Doe"). */
export function namesMatch(a: string, b: string): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return true;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.every((t) => long.includes(t));
}

export type AttendeeAccountDiff = {
  nameDiffers: boolean;
  emailDiffers: boolean;
  differs: boolean;
};

/**
 * Compares the signup-form attendee with the account that submitted it. A field only counts as
 * different when both sides have a value to compare.
 */
export function compareAttendeeToAccount(r: RosterAttendeeFields, account: RosterAccount): AttendeeAccountDiff {
  const attendeeName = attendeeDisplayName(r);
  const accountName = clean(account.name);
  const nameDiffers = !!attendeeName && !!accountName && !namesMatch(attendeeName, accountName);

  const attendeeEmail = clean(r.contact_email).toLowerCase();
  const accountEmail = clean(account.email).toLowerCase();
  const emailDiffers = !!attendeeEmail && !!accountEmail && attendeeEmail !== accountEmail;

  return { nameDiffers, emailDiffers, differs: nameDiffers || emailDiffers };
}

export type RosterStatusInfo = {
  kind: "enrolled" | "waitlisted" | "other";
  /** "Enrolled" / "Waitlisted" (raw status for anything unexpected). */
  label: string;
  /** "#2" for waitlisted rows with a position, otherwise null. */
  positionText: string | null;
};

/** Admin-facing label for a registration status (`registered` is shown as "Enrolled"). */
export function rosterStatusInfo(status: string, waitlistPosition: number | null | undefined): RosterStatusInfo {
  if (status === "registered") return { kind: "enrolled", label: "Enrolled", positionText: null };
  if (status === "waitlisted") {
    return {
      kind: "waitlisted",
      label: "Waitlisted",
      positionText: waitlistPosition != null ? `#${waitlistPosition}` : null,
    };
  }
  return { kind: "other", label: status, positionText: null };
}
