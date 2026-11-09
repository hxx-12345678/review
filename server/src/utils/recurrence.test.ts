import assert from "node:assert/strict";
import test from "node:test";
import { POST_RESOLUTION_RECURRENCE_DAYS, postResolutionCutoff } from "./recurrence";

test("post-resolution window is 90 days", () => {
  assert.equal(POST_RESOLUTION_RECURRENCE_DAYS, 90);
});

test("cutoff is exactly the window before the supplied time", () => {
  const now = new Date("2026-11-10T00:00:00.000Z");
  const cutoff = postResolutionCutoff(now);
  assert.equal(now.getTime() - cutoff.getTime(), 90 * 86400000);
  assert.equal(cutoff.toISOString(), "2026-08-12T00:00:00.000Z");
});
