// Notification extension point.
// Review scheduling calls `notifier.onReviewScheduled` whenever a next review
// date is decided. Swap `notifier` for a real implementation (Web Push, email,
// etc.) later without touching the review logic.

export interface ReviewNotice {
  unitId: string;
  title: string;
  dueAt: Date;
}

export interface Notifier {
  onReviewScheduled(notice: ReviewNotice): Promise<void> | void;
  onReviewCleared(unitId: string): Promise<void> | void;
}

const noopNotifier: Notifier = {
  onReviewScheduled: () => {},
  onReviewCleared: () => {},
};

export let notifier: Notifier = noopNotifier;

export function setNotifier(n: Notifier) {
  notifier = n;
}
