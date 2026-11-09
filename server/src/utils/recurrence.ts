/**
 * Post-resolution recurrence policy.
 *
 * A repeated issue always counts as recurrence. It only counts as a *failed
 * fix* when the prior task was resolved recently enough that the same
 * operational cause is plausibly still in play.
 */

export const POST_RESOLUTION_RECURRENCE_DAYS = 90;

export function postResolutionCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - POST_RESOLUTION_RECURRENCE_DAYS * 86400000);
}
