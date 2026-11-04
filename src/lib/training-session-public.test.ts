import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isTrainingSessionSignupBlockedByStatus,
  isTrainingSessionWaitlistAllowed,
  shouldShowTrainingSessionStatusBadge,
  trainingSessionCannotSelfServeSignup,
  trainingSessionOffersWaitlist,
} from "./training-session-public.ts";

const PAST = new Date(Date.now() - 60_000).toISOString();
const FUTURE = new Date(Date.now() + 3_600_000).toISOString();

describe("isTrainingSessionWaitlistAllowed", () => {
  const cases: Array<[string, boolean, boolean]> = [
    ["open", true, true],
    ["open", false, false],
    ["full", true, true],
    ["full", false, false],
    ["closed", true, false],
    ["closed", false, false],
    ["cancelled", true, false],
    ["cancelled", false, false],
    ["draft", true, false],
    ["draft", false, false],
  ];
  for (const [status, waitlistEnabled, expected] of cases) {
    it(`${status} with waitlist ${waitlistEnabled ? "on" : "off"} -> ${expected}`, () => {
      assert.equal(isTrainingSessionWaitlistAllowed(status, waitlistEnabled), expected);
    });
  }

  it("treats missing waitlist setting as off", () => {
    assert.equal(isTrainingSessionWaitlistAllowed("full", null), false);
    assert.equal(isTrainingSessionWaitlistAllowed("full", undefined), false);
  });

  it("is case-insensitive on status", () => {
    assert.equal(isTrainingSessionWaitlistAllowed("FULL", true), true);
  });
});

describe("isTrainingSessionSignupBlockedByStatus", () => {
  const cases: Array<[string, boolean, boolean]> = [
    ["open", true, false],
    ["open", false, false],
    ["full", true, false],
    ["full", false, true],
    ["closed", true, true],
    ["closed", false, true],
    ["cancelled", true, true],
    ["cancelled", false, true],
    ["draft", true, true],
    ["draft", false, true],
  ];
  for (const [status, waitlistEnabled, expected] of cases) {
    it(`${status} with waitlist ${waitlistEnabled ? "on" : "off"} -> blocked=${expected}`, () => {
      assert.equal(isTrainingSessionSignupBlockedByStatus(status, waitlistEnabled), expected);
    });
  }
});

describe("trainingSessionCannotSelfServeSignup", () => {
  it("lets a full class with waitlist on through before the signup window closes", () => {
    assert.equal(trainingSessionCannotSelfServeSignup("full", FUTURE, true), false);
    assert.equal(trainingSessionCannotSelfServeSignup("full", null, true), false);
  });

  it("blocks a full class when the waitlist is off", () => {
    assert.equal(trainingSessionCannotSelfServeSignup("full", null, false), true);
  });

  it("blocks closed and cancelled classes even with the waitlist on", () => {
    assert.equal(trainingSessionCannotSelfServeSignup("closed", null, true), true);
    assert.equal(trainingSessionCannotSelfServeSignup("cancelled", null, true), true);
  });

  it("blocks everything once the signup window has closed", () => {
    assert.equal(trainingSessionCannotSelfServeSignup("open", PAST, true), true);
    assert.equal(trainingSessionCannotSelfServeSignup("full", PAST, true), true);
  });
});

describe("trainingSessionOffersWaitlist", () => {
  const base = { registration_closes_at: null, spots_remaining: 0 };

  it("offers the waitlist for open and full classes with no seats when enabled", () => {
    assert.equal(trainingSessionOffersWaitlist({ ...base, status: "open", waitlist_enabled: true }), true);
    assert.equal(trainingSessionOffersWaitlist({ ...base, status: "full", waitlist_enabled: true }), true);
  });

  it("does not offer the waitlist when disabled", () => {
    assert.equal(trainingSessionOffersWaitlist({ ...base, status: "open", waitlist_enabled: false }), false);
    assert.equal(trainingSessionOffersWaitlist({ ...base, status: "full", waitlist_enabled: false }), false);
  });

  it("never offers the waitlist for closed, cancelled or draft", () => {
    for (const status of ["closed", "cancelled", "draft"]) {
      assert.equal(trainingSessionOffersWaitlist({ ...base, status, waitlist_enabled: true }), false);
      assert.equal(trainingSessionOffersWaitlist({ ...base, status, waitlist_enabled: false }), false);
    }
  });

  it("does not offer the waitlist while seats remain", () => {
    assert.equal(
      trainingSessionOffersWaitlist({ ...base, status: "open", waitlist_enabled: true, spots_remaining: 2 }),
      false
    );
  });

  it("does not offer the waitlist after the signup window closes", () => {
    assert.equal(
      trainingSessionOffersWaitlist({
        ...base,
        status: "full",
        waitlist_enabled: true,
        registration_closes_at: PAST,
      }),
      false
    );
  });
});

describe("shouldShowTrainingSessionStatusBadge", () => {
  it("shows a badge for full, closed and cancelled only", () => {
    assert.equal(shouldShowTrainingSessionStatusBadge("full"), true);
    assert.equal(shouldShowTrainingSessionStatusBadge("closed"), true);
    assert.equal(shouldShowTrainingSessionStatusBadge("cancelled"), true);
    assert.equal(shouldShowTrainingSessionStatusBadge("open"), false);
    assert.equal(shouldShowTrainingSessionStatusBadge("draft"), false);
  });
});
