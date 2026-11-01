import { supabase } from "@/integrations/supabase/client";
import { emptyBackup, parseBackup, type Backup } from "./local-model";
import type { Unit, ReviewLog } from "./cloud-data";

async function fetchAll(table: "study_units" | "review_logs") {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("id")
      .range(from, from + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export function convertCloud(units: Unit[], logs: ReviewLog[]): Backup {
  const b = emptyBackup();
  for (const u of units) {
    // Stable, reversible identity: repeated exports retain the same associations.
    const subject_id = "cloud-subject:" + JSON.stringify(u.subject);
    const material_id = "cloud-material:" + JSON.stringify([u.subject, u.material]);
    if (!b.subjects.some((s) => s.id === subject_id))
      b.subjects.push({ id: subject_id, name: u.subject || "科目未設定" });
    if (!b.materials.some((m) => m.id === material_id))
      b.materials.push({ id: material_id, subject_id, name: u.material || "教材未設定" });
    const { id, unit_name, pages, memo, studied_at, created_at, stage, next_review_at } = u;
    b.units.push({
      id,
      subject_id,
      material_id,
      unit_name,
      pages,
      memo,
      studied_at,
      created_at,
      stage,
      next_review_at,
    });
  }
  b.logs = logs.map(
    ({ id, unit_id, scheduled_at, reviewed_at, result, stage_before, stage_after }) => ({
      id,
      unit_id,
      scheduled_at,
      reviewed_at,
      result,
      stage_before,
      stage_after,
    }),
  );
  return parseBackup(b);
}
export async function exportCloud(): Promise<Backup> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("既存アカウントでログインしてください");
  const userId = data.user.id;
  const read = async () => ({
    units: await fetchAll("study_units"),
    logs: await fetchAll("review_logs"),
  });
  const first = await read();
  const second = await read();
  const check = await supabase.auth.getUser();
  if (
    check.error ||
    check.data.user?.id !== userId ||
    JSON.stringify(first) !== JSON.stringify(second)
  )
    throw new Error(
      "取得中にデータまたはログイン状態が変わりました。他端末での編集を止めて再試行してください",
    );
  return convertCloud(second.units as Unit[], second.logs as ReviewLog[]);
}
export function downloadBackup(b: Backup) {
  const checked = parseBackup(b);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(checked, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `Rememo-backup-${checked.created_at.replace(/[:.]/g, "-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
