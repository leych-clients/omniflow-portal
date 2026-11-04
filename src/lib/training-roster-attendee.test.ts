import assert from "node:assert/strict";
import test from "node:test";

import {
  attendeeDisplayName,
  compareAttendeeToAccount,
  hasSignupDetails,
  namesMatch,
  rosterStatusInfo,
} from "./training-roster-attendee.ts";

test("attendeeDisplayName joins trimmed first and last name", () => {
  assert.equal(attendeeDisplayName({ first_name: " Jane ", last_name: "Doe" }), "Jane Doe");
  assert.equal(attendeeDisplayName({ first_name: "Jane", last_name: null }), "Jane");
  assert.equal(attendeeDisplayName({ first_name: "  ", last_name: "" }), null);
  assert.equal(attendeeDisplayName({}), null);
});

test("hasSignupDetails is false for admin-added rows with no form data", () => {
  assert.equal(hasSignupDetails({}), false);
  assert.equal(
    hasSignupDetails({ first_name: null, last_name: " ", contact_email: "", contact_phone: null }),
    false
  );
  assert.equal(hasSignupDetails({ contact_email: "a@b.co" }), true);
  assert.equal(hasSignupDetails({ certificate_company_name: "Acme" }), true);
});

test("namesMatch ignores case, accents, punctuation and middle names", () => {
  assert.equal(namesMatch("Jane Doe", "jane  DOE"), true);
  assert.equal(namesMatch("José Núñez", "Jose Nunez"), true);
  assert.equal(namesMatch("Jane Doe", "Jane Q. Doe"), true);
  assert.equal(namesMatch("Doe, Jane", "Jane Doe"), true);
  assert.equal(namesMatch("Jane Doe", "John Smith"), false);
});

test("compareAttendeeToAccount flags a different person", () => {
  const d = compareAttendeeToAccount(
    { first_name: "John", last_name: "Smith", contact_email: "john@acme.com" },
    { name: "Jane Doe", email: "jane@acme.com" }
  );
  assert.deepEqual(d, { nameDiffers: true, emailDiffers: true, differs: true });
});

test("compareAttendeeToAccount treats same person as matching (email case-insensitive)", () => {
  const d = compareAttendeeToAccount(
    { first_name: "Jane", last_name: "Doe", contact_email: "Jane@Acme.com " },
    { name: "Jane Doe", email: "jane@acme.com" }
  );
  assert.equal(d.differs, false);
});

test("compareAttendeeToAccount flags only the differing field", () => {
  const d = compareAttendeeToAccount(
    { first_name: "Jane", last_name: "Doe", contact_email: "jane.doe@other.com" },
    { name: "Jane Doe", email: "jane@acme.com" }
  );
  assert.deepEqual(d, { nameDiffers: false, emailDiffers: true, differs: true });
});

test("compareAttendeeToAccount does not flag when a side is missing", () => {
  assert.equal(compareAttendeeToAccount({}, { name: "Jane", email: "j@a.co" }).differs, false);
  assert.equal(
    compareAttendeeToAccount({ first_name: "Jane", contact_email: "j@a.co" }, { name: null, email: "" }).differs,
    false
  );
});

test("rosterStatusInfo maps registered to Enrolled and waitlisted to Waitlisted with position", () => {
  assert.deepEqual(rosterStatusInfo("registered", null), { kind: "enrolled", label: "Enrolled", positionText: null });
  assert.deepEqual(rosterStatusInfo("registered", 3), { kind: "enrolled", label: "Enrolled", positionText: null });
  assert.deepEqual(rosterStatusInfo("waitlisted", 2), { kind: "waitlisted", label: "Waitlisted", positionText: "#2" });
  assert.deepEqual(rosterStatusInfo("waitlisted", null), { kind: "waitlisted", label: "Waitlisted", positionText: null });
  assert.equal(rosterStatusInfo("cancelled", null).kind, "other");
});
