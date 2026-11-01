import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { emptyBackup, mergeBackups, parseBackup } from "@/lib/local-model";
import { readLocal, restoreLocal, changeLocal, markBackup, backupDue } from "@/lib/local-store";
import { saveSubject, saveMaterial, deleteCatalog } from "@/lib/catalog";
import { convertCloud } from "@/lib/cloud-export";
import { presentUnits } from "@/lib/data";
import { firstReview } from "@/lib/srs";
const date = "2026-11-01T00:00:00.000Z";
function fixture() {
  const b = emptyBackup();
  b.subjects = [{ id: "s", name: "民法" }];
  b.materials = [{ id: "m", subject_id: "s", name: "基本書" }];
  b.units = [
    {
      id: "u",
      subject_id: "s",
      material_id: "m",
      unit_name: "意思表示",
      pages: "1-10",
      memo: "学習メモ",
      studied_at: date,
      created_at: date,
      stage: 1,
      next_review_at: "2026-11-02T01:00:00.000Z",
    },
  ];
  b.logs = [
    {
      id: "l",
      unit_id: "u",
      scheduled_at: firstReview(new Date(date)).toISOString(),
      reviewed_at: "2026-11-01T01:00:00.000Z",
      result: "good",
      stage_before: 0,
      stage_after: 1,
    },
  ];
  return b;
}
beforeEach(async () => {
  const s = await readLocal();
  await restoreLocal(emptyBackup(), "replace", s.revision);
});
describe("backup validation and merging", () => {
  it("round trips all study data and exact review times", () => {
    const b = fixture();
    expect(parseBackup(JSON.parse(JSON.stringify(b)))).toEqual(b);
  });
  it("rejects unknown formats, duplicate IDs, broken relationships and invalid stages", () => {
    const b = fixture();
    expect(() => parseBackup({ ...b, version: 99 })).toThrow();
    expect(() => parseBackup({ ...b, subjects: [...b.subjects, ...b.subjects] })).toThrow();
    expect(() => parseBackup({ ...b, materials: [] })).toThrow();
    expect(() => parseBackup({ ...b, units: [] })).toThrow();
    expect(() => parseBackup({ ...b, units: [{ ...b.units[0], stage: 6 }] })).toThrow();
    expect(() => parseBackup({ ...b, units: [{ ...b.units[0], studied_at: "bad" }] })).toThrow();
  });
  it("deduplicates by ID, accepts disjoint additions, and blocks conflicting edits", () => {
    const b = fixture();
    expect(mergeBackups(b, b).units).toHaveLength(1);
    const other = emptyBackup();
    other.subjects.push({ id: "s2", name: "刑法" });
    expect(mergeBackups(b, other).subjects).toHaveLength(2);
    const edit = structuredClone(b);
    edit.units[0]!.memo = "別端末";
    expect(() => mergeBackups(b, edit)).toThrow("競合");
    const renamed = structuredClone(b);
    renamed.subjects[0]!.name = "変更";
    expect(() => mergeBackups(b, renamed)).toThrow("競合");
  });
  it("imports selections on an empty device and retains selections on an existing device", () => {
    const incoming = fixture();
    incoming.settings = { last_subject_id: "s", last_material_id: "m" };
    expect(mergeBackups(emptyBackup(), incoming).settings).toEqual(incoming.settings);
    const current = fixture();
    expect(mergeBackups(current, incoming).settings).toEqual(current.settings);
  });
  it("blocks divergent review histories even when the unit stage matches", () => {
    const b = fixture(),
      other = structuredClone(b);
    other.logs[0]!.id = "other";
    expect(() => mergeBackups(b, other)).toThrow("復習履歴");
  });
  it("converts legacy cloud rows without credentials, preserving IDs, history and due dates", () => {
    const b = fixture();
    const u = b.units[0]!;
    const cloud = [{ ...u, subject: "民法", material: "基本書", user_id: "private-user" }];
    const converted = convertCloud(cloud, b.logs);
    expect(converted.units[0]!.id).toBe(u.id);
    expect(converted.units[0]!.next_review_at).toBe(u.next_review_at);
    expect(converted.logs).toEqual(b.logs);
    expect(JSON.stringify(converted)).not.toContain("private-user");
    expect(convertCloud(cloud, b.logs).subjects).toEqual(converted.subjects);
  });
});
describe("IndexedDB safety", () => {
  it("persists a restored snapshot across independent reads", async () => {
    const s = await readLocal(),
      b = fixture();
    await restoreLocal(b, "replace", s.revision);
    expect((await readLocal()).data).toEqual(b);
    expect((await readLocal()).data.logs[0]!.unit_id).toBe("u");
  });
  it("aborts invalid writes without partially saving data", async () => {
    await expect(
      changeLocal((b) => {
        b.subjects.push({ id: "s", name: "科目" });
        throw new Error("failure");
      }),
    ).rejects.toThrow("failure");
    expect((await readLocal()).data.subjects).toHaveLength(0);
    await expect(
      changeLocal((b) => {
        b.logs = fixture().logs;
      }),
    ).rejects.toThrow();
    expect((await readLocal()).data.logs).toHaveLength(0);
  });
  it("rejects stale restore confirmation after another transaction", async () => {
    const s = await readLocal();
    await saveSubject("別タブ");
    await expect(restoreLocal(fixture(), "replace", s.revision)).rejects.toThrow("更新");
    expect((await readLocal()).data.subjects[0]!.name).toBe("別タブ");
  });
  it("serializes concurrent writes without losing records", async () => {
    await Promise.all([saveSubject("科目A"), saveSubject("科目B")]);
    expect((await readLocal()).data.subjects).toHaveLength(2);
  });
  it("renames by stable ID and protects referenced subjects/materials", async () => {
    const s = await readLocal();
    await restoreLocal(fixture(), "replace", s.revision);
    await saveSubject("新しい科目名", "s");
    await saveMaterial("新しい教材名", "s", "m");
    const b = (await readLocal()).data;
    expect(presentUnits(b)[0]).toMatchObject({
      id: "u",
      subject_id: "s",
      material_id: "m",
      subject: "新しい科目名",
      material: "新しい教材名",
    });
    await expect(deleteCatalog("subject", "s")).rejects.toThrow("学習記録");
    await expect(deleteCatalog("material", "m")).rejects.toThrow("学習記録");
    await saveSubject("別科目");
    const other = (await readLocal()).data.subjects.at(-1)!;
    await expect(saveMaterial("移動", other.id, "m")).rejects.toThrow("科目を変更");
  });
  it("retains last actual backup time during restoration and flags seven days", async () => {
    await markBackup(date);
    const s = await readLocal();
    await restoreLocal(fixture(), "replace", s.revision);
    expect((await readLocal()).lastBackupAt).toBe(date);
    expect(backupDue(date, Date.parse(date) + 7 * 86400000)).toBe(true);
    expect(backupDue(date, Date.parse(date) + 86400000)).toBe(false);
    expect(backupDue(null)).toBe(true);
  });
});
