import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as cloud from "./cloud-data";
import { isLocalMode } from "./storage-mode";
import { changeLocal, readLocal } from "./local-store";
import { firstReview, applyReview, type ReviewResult } from "./srs";
import { notifier } from "./notifications";
import type { Backup } from "./local-model";
export type { Unit, UnitInput, ReviewLog } from "./cloud-data";
export { startOfDay, sameDay, fmtDateTime } from "./cloud-data";

export function useLocalState() {
  return useQuery({
    queryKey: ["local-state"],
    queryFn: readLocal,
    enabled: isLocalMode(),
    refetchOnWindowFocus: true,
  });
}
export function presentUnits(b: Backup): cloud.Unit[] {
  return b.units
    .map((u) => ({
      ...u,
      subject: b.subjects.find((s) => s.id === u.subject_id)!.name,
      material: b.materials.find((m) => m.id === u.material_id)!.name,
    }))
    .sort((a, b) => b.studied_at.localeCompare(a.studied_at));
}
// Hook selection is fixed for the document lifetime; mode switches reload the page.
export function useUnits() {
  const local = useQuery({
    queryKey: ["local-units"],
    queryFn: async () => presentUnits((await readLocal()).data),
    enabled: isLocalMode(),
  });
  const remote = cloud.useUnitsForMode(!isLocalMode());
  return isLocalMode() ? local : remote;
}
export function useLogs() {
  const local = useQuery({
    queryKey: ["local-logs"],
    queryFn: async () =>
      (await readLocal()).data.logs.sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at)),
    enabled: isLocalMode(),
  });
  const remote = cloud.useLogsForMode(!isLocalMode());
  return isLocalMode() ? local : remote;
}
export function useSaveUnit() {
  const qc = useQueryClient();
  const remote = cloud.useSaveUnit();
  const local = useMutation({
    mutationFn: async ({ id, input }: { id?: string | undefined; input: cloud.UnitInput }) => {
      const result = await changeLocal((b) => {
        const m = b.materials.find(
          (m) => m.id === input.material_id && m.subject_id === input.subject_id,
        );
        if (!m) throw new Error("科目と教材を選択してください");
        const fields = {
          subject_id: m.subject_id,
          material_id: m.id,
          unit_name: input.unit_name.trim(),
          pages: input.pages,
          memo: input.memo,
          studied_at: input.studied_at.toISOString(),
        };
        if (id) {
          const unit = b.units.find((u) => u.id === id);
          if (!unit) throw new Error("記録が見つかりません");
          Object.assign(unit, fields);
        } else
          b.units.push({
            ...fields,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            stage: 0,
            next_review_at: firstReview(input.studied_at).toISOString(),
          });
        b.settings = { last_subject_id: m.subject_id, last_material_id: m.id };
      });
      const unit = id ? result.data.units.find((u) => u.id === id) : result.data.units.at(-1);
      if (unit?.next_review_at)
        await notifier.onReviewScheduled({
          unitId: unit.id,
          title: unit.unit_name,
          dueAt: new Date(unit.next_review_at),
        });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
  return isLocalMode() ? local : remote;
}
export function useDeleteUnit() {
  const qc = useQueryClient();
  const remote = cloud.useDeleteUnit();
  const local = useMutation({
    mutationFn: async (id: string) => {
      await changeLocal((b) => {
        b.units = b.units.filter((u) => u.id !== id);
        b.logs = b.logs.filter((l) => l.unit_id !== id);
      });
      await notifier.onReviewCleared(id);
    },
    onSuccess: () => qc.invalidateQueries(),
  });
  return isLocalMode() ? local : remote;
}
export function useRecordReview() {
  const qc = useQueryClient();
  const remote = cloud.useRecordReview();
  const local = useMutation({
    mutationFn: async ({ unit, result }: { unit: cloud.Unit; result: ReviewResult }) => {
      const now = new Date();
      let outcome!: ReturnType<typeof applyReview>;
      await changeLocal((b) => {
        const u = b.units.find((u) => u.id === unit.id);
        if (
          !u ||
          u.stage === 6 ||
          u.stage !== unit.stage ||
          u.next_review_at !== unit.next_review_at
        )
          throw new Error("記録が更新されています。画面を更新してください");
        outcome = applyReview(u.stage, result, now);
        b.logs.push({
          id: crypto.randomUUID(),
          unit_id: u.id,
          scheduled_at: u.next_review_at,
          reviewed_at: now.toISOString(),
          result,
          stage_before: u.stage,
          stage_after: outcome.stage,
        });
        u.stage = outcome.stage;
        u.next_review_at = outcome.nextReviewAt?.toISOString() ?? null;
      });
      if (outcome.nextReviewAt)
        await notifier.onReviewScheduled({
          unitId: unit.id,
          title: unit.unit_name,
          dueAt: outcome.nextReviewAt,
        });
      else await notifier.onReviewCleared(unit.id);
      return outcome;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
  return isLocalMode() ? local : remote;
}
