import { describe, expect, it } from "vitest";
import { applyReview, firstReview } from "@/lib/srs";

const now = new Date("2026-01-01T00:00:00Z");
const H = 3600_000;
const D = 24 * H;

describe("spaced repetition", () => {
  it("first review is 1 hour after studying", () => {
    expect(firstReview(now).getTime() - now.getTime()).toBe(H);
  });
  it("remembered at the 1h review → next in 1 day", () => {
    const r = applyReview(0, "good", now);
    expect(r.stage).toBe(1);
    expect(r.nextReviewAt!.getTime() - now.getTime()).toBe(D);
  });
  it("remembered at the 7d review → next in 14 days", () => {
    expect(applyReview(3, "good", now).nextReviewAt!.getTime() - now.getTime()).toBe(14 * D);
  });
  it("unsure repeats the same interval", () => {
    const r = applyReview(2, "unsure", now);
    expect(r.stage).toBe(2);
    expect(r.nextReviewAt!.getTime() - now.getTime()).toBe(3 * D);
  });
  it("forgot goes back to 1 hour", () => {
    const r = applyReview(4, "forgot", now);
    expect(r.stage).toBe(0);
    expect(r.nextReviewAt!.getTime() - now.getTime()).toBe(H);
  });
  it("remembered at the 30d review finishes the schedule", () => {
    expect(applyReview(5, "good", now)).toEqual({ stage: 6, nextReviewAt: null });
  });
});
