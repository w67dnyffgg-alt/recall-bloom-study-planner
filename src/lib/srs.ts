// Spaced repetition rules. Pure functions so they are easy to test and reuse
// (e.g. by a future notification scheduler).

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Interval for each review stage: 1h → 1d → 3d → 7d → 14d → 30d */
export const INTERVALS_MS = [HOUR, DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY] as const;
export const INTERVAL_LABELS = ["1時間後", "1日後", "3日後", "7日後", "14日後", "30日後"] as const;
export const FINAL_STAGE = INTERVALS_MS.length; // stage === 6 → all reviews finished

export type ReviewResult = "good" | "unsure" | "forgot";

export const RESULT_LABELS: Record<ReviewResult, string> = {
  good: "覚えていた",
  unsure: "あやふや",
  forgot: "忘れていた",
};

/** First review date after studying. */
export function firstReview(studiedAt: Date): Date {
  return new Date(studiedAt.getTime() + INTERVALS_MS[0]);
}

/**
 * `stage` = index of the review that is currently due (0 = the 1h review).
 * - good:   advance to the next interval
 * - unsure: repeat the same interval
 * - forgot: back to the shortest interval (1h)
 */
export function applyReview(
  stage: number,
  result: ReviewResult,
  now: Date = new Date(),
): { stage: number; nextReviewAt: Date | null } {
  let next: number;
  if (result === "good") next = stage + 1;
  else if (result === "unsure") next = Math.max(stage, 0);
  else next = 0;

  if (next >= FINAL_STAGE) return { stage: FINAL_STAGE, nextReviewAt: null };
  return { stage: next, nextReviewAt: new Date(now.getTime() + (INTERVALS_MS[next] ?? 0)) };
}
