import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { applyReview, firstReview, type ReviewResult } from "@/lib/srs";
import { notifier } from "@/lib/notifications";

export type Unit = {
  id: string;
  subject: string;
  material: string;
  unit_name: string;
  pages: string;
  studied_at: string;
  memo: string;
  stage: number;
  next_review_at: string | null;
  created_at: string;
};

export type ReviewLog = {
  id: string;
  unit_id: string;
  scheduled_at: string | null;
  reviewed_at: string;
  result: ReviewResult;
  stage_before: number;
  stage_after: number;
};

export type UnitInput = Pick<Unit, "subject" | "material" | "unit_name" | "pages" | "memo"> & {
  studied_at: Date;
};

export function useUnits() {
  return useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_units")
        .select("*")
        .order("studied_at", { ascending: false });
      if (error) throw error;
      return data as Unit[];
    },
  });
}

export function useLogs() {
  return useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_logs")
        .select("*")
        .order("reviewed_at", { ascending: false });
      if (error) throw error;
      return data as ReviewLog[];
    },
  });
}

export function useSaveUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string | undefined; input: UnitInput }) => {
      const base = {
        subject: input.subject,
        material: input.material,
        unit_name: input.unit_name,
        pages: input.pages,
        memo: input.memo,
        studied_at: input.studied_at.toISOString(),
      };
      if (id) {
        const { error } = await supabase.from("study_units").update(base).eq("id", id);
        if (error) throw error;
        return;
      }
      const next = firstReview(input.studied_at);
      const { data, error } = await supabase
        .from("study_units")
        .insert({ ...base, stage: 0, next_review_at: next.toISOString() })
        .select("id")
        .single();
      if (error) throw error;
      await notifier.onReviewScheduled({ unitId: data.id, title: input.unit_name, dueAt: next });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["units"] }),
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("study_units").delete().eq("id", id);
      if (error) throw error;
      await notifier.onReviewCleared(id);
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useRecordReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ unit, result }: { unit: Unit; result: ReviewResult }) => {
      const now = new Date();
      const { stage, nextReviewAt } = applyReview(unit.stage, result, now);
      const { error: logErr } = await supabase.from("review_logs").insert({
        unit_id: unit.id,
        scheduled_at: unit.next_review_at,
        reviewed_at: now.toISOString(),
        result,
        stage_before: unit.stage,
        stage_after: stage,
      });
      if (logErr) throw logErr;
      const { error } = await supabase
        .from("study_units")
        .update({ stage, next_review_at: nextReviewAt?.toISOString() ?? null })
        .eq("id", unit.id);
      if (error) throw error;
      if (nextReviewAt)
        await notifier.onReviewScheduled({ unitId: unit.id, title: unit.unit_name, dueAt: nextReviewAt });
      else await notifier.onReviewCleared(unit.id);
      return { stage, nextReviewAt };
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}
export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
