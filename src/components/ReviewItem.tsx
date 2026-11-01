import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fmtDateTime, useRecordReview, type Unit } from "@/lib/data";
import { INTERVAL_LABELS, RESULT_LABELS, type ReviewResult } from "@/lib/srs";

export function ReviewItem({ unit, overdue, actionable = true }: { unit: Unit; overdue?: boolean; actionable?: boolean }) {
  const rec = useRecordReview();
  async function go(result: ReviewResult) {
    try {
      const r = await rec.mutateAsync({ unit, result });
      toast.success(
        r.nextReviewAt
          ? `${RESULT_LABELS[result]}：次回は ${fmtDateTime(r.nextReviewAt.toISOString())}`
          : "すべての復習が完了しました 🎉",
      );
    } catch (e) {
      toast.error("保存できませんでした");
    }
  }
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {unit.subject}
            {unit.material && ` ・ ${unit.material}`}
          </p>
          <p className="mt-1 font-semibold truncate">{unit.unit_name}</p>
          {unit.pages && <p className="text-xs text-muted-foreground mt-0.5">p. {unit.pages}</p>}
        </div>
        <div className="text-right shrink-0">
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-[11px] ${overdue ? "bg-primary-soft text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            {INTERVAL_LABELS[unit.stage] ?? "完了"}の復習
          </span>
          {unit.next_review_at && (
            <p className="text-[11px] text-muted-foreground mt-1">{fmtDateTime(unit.next_review_at)}</p>
          )}
        </div>
      </div>
      {actionable && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["good", "unsure", "forgot"] as const).map((r) => (
            <Button key={r} size="sm" variant={r} disabled={rec.isPending} onClick={() => go(r)}>
              {RESULT_LABELS[r]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
