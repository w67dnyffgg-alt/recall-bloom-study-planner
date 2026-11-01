import { z } from "zod";

const id = z.string().min(1);
const date = z.string().datetime({ offset: true });
const stage = z.number().int().min(0).max(6);
export const subjectSchema = z.object({ id, name: z.string().min(1) }).strict();
export const materialSchema = subjectSchema.extend({ subject_id: id });
export const localUnitSchema = z
  .object({
    id,
    subject_id: id,
    material_id: id,
    unit_name: z.string().min(1),
    pages: z.string(),
    memo: z.string(),
    studied_at: date,
    created_at: date,
    stage,
    next_review_at: date.nullable(),
  })
  .strict();
export const logSchema = z
  .object({
    id,
    unit_id: id,
    scheduled_at: date.nullable(),
    reviewed_at: date,
    result: z.enum(["good", "unsure", "forgot"]),
    stage_before: stage,
    stage_after: stage,
  })
  .strict();
export const settingsSchema = z
  .object({
    last_subject_id: z.string().nullable(),
    last_material_id: z.string().nullable(),
  })
  .strict();
export const backupSchema = z
  .object({
    format: z.literal("rememo"),
    version: z.literal(1),
    created_at: date,
    subjects: z.array(subjectSchema),
    materials: z.array(materialSchema),
    units: z.array(localUnitSchema),
    logs: z.array(logSchema),
    settings: settingsSchema,
  })
  .strict()
  .superRefine((b, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    for (const [name, rows] of Object.entries({
      subjects: b.subjects,
      materials: b.materials,
      units: b.units,
      logs: b.logs,
    })) {
      if (new Set(rows.map((r) => r.id)).size !== rows.length) fail(`${name}: IDが重複しています`);
    }
    const subjects = new Set(b.subjects.map((s) => s.id));
    const materials = new Map(b.materials.map((m) => [m.id, m]));
    const units = new Set(b.units.map((u) => u.id));
    for (const m of b.materials) if (!subjects.has(m.subject_id)) fail("教材の科目が存在しません");
    for (const u of b.units) {
      if (!subjects.has(u.subject_id) || materials.get(u.material_id)?.subject_id !== u.subject_id)
        fail("学習記録の科目・教材の紐づけが不正です");
      if ((u.stage === 6) !== (u.next_review_at === null)) fail("復習段階と次回予定が一致しません");
    }
    for (const l of b.logs) if (!units.has(l.unit_id)) fail("復習履歴の学習記録が存在しません");
    if (b.settings.last_subject_id && !subjects.has(b.settings.last_subject_id))
      fail("前回の科目が存在しません");
    if (
      b.settings.last_material_id &&
      materials.get(b.settings.last_material_id)?.subject_id !== b.settings.last_subject_id
    )
      fail("前回の教材が存在しません");
  });
export type Backup = z.infer<typeof backupSchema>;
export type LocalUnit = z.infer<typeof localUnitSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type Material = z.infer<typeof materialSchema>;
export function emptyBackup(): Backup {
  return {
    format: "rememo",
    version: 1,
    created_at: new Date().toISOString(),
    subjects: [],
    materials: [],
    units: [],
    logs: [],
    settings: { last_subject_id: null, last_material_id: null },
  };
}
export function parseBackup(value: unknown): Backup {
  const parsed = backupSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "バックアップ形式または整合性に問題があります：" +
        parsed.error.issues.map((i) => i.message).join(" / "),
    );
  return parsed.data;
}
function equal(a: unknown, b: unknown): boolean {
  const canonical = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, canonical(x)]),
          )
        : v;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
export function mergeBackups(current: Backup, incoming: Backup): Backup {
  const merged = structuredClone(current);
  const conflicts: string[] = [];
  for (const key of ["subjects", "materials", "units", "logs"] as const) {
    const map = new Map<string, { id: string }>(current[key].map((r) => [r.id, r]));
    for (const row of incoming[key]) {
      const existing = map.get(row.id);
      if (existing && !equal(existing, row)) conflicts.push(`${key}: ${row.id}`);
      else map.set(row.id, row);
    }
    // Each collection is validated as a whole after combining it.
    Object.assign(merged, { [key]: [...map.values()] });
  }
  // A differing review history on a shared unit may describe divergent devices,
  // even if their current stage happens to match. Never guess which is correct.
  for (const u of current.units) {
    if (!incoming.units.some((x) => x.id === u.id)) continue;
    const a = current.logs
      .filter((l) => l.unit_id === u.id)
      .sort((x, y) => x.id.localeCompare(y.id));
    const b = incoming.logs
      .filter((l) => l.unit_id === u.id)
      .sort((x, y) => x.id.localeCompare(y.id));
    if (!equal(a, b)) conflicts.push(`復習履歴: ${u.unit_name}`);
  }
  if (conflicts.length)
    throw new Error(
      `競合があるため統合を中止しました。両方のファイルを保管し、内容を確認してください。置換は端末側の内容を失います。\n${conflicts.slice(0, 20).join("\n")}`,
    );
  // Use imported preferences on a fresh device; otherwise preserve this device.
  if (
    !current.subjects.length &&
    !current.materials.length &&
    !current.units.length &&
    !current.logs.length
  )
    merged.settings = incoming.settings;
  return parseBackup(merged);
}
