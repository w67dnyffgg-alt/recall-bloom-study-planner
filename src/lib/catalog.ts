import { changeLocal } from "./local-store";
export function saveSubject(name: string, id?: string) {
  return changeLocal((b) => {
    name = name.trim();
    if (!name) throw new Error("科目名を入力してください");
    if (b.subjects.some((s) => s.name === name && s.id !== id))
      throw new Error("同名の科目があります");
    if (id) {
      const s = b.subjects.find((s) => s.id === id);
      if (!s) throw new Error("科目が見つかりません");
      s.name = name;
    } else b.subjects.push({ id: crypto.randomUUID(), name });
  });
}
export function saveMaterial(name: string, subject_id: string, id?: string) {
  return changeLocal((b) => {
    name = name.trim();
    if (!name || !b.subjects.some((s) => s.id === subject_id))
      throw new Error("教材名と科目を指定してください");
    if (b.materials.some((m) => m.subject_id === subject_id && m.name === name && m.id !== id))
      throw new Error("同じ科目に同名の教材があります");
    if (id) {
      const m = b.materials.find((m) => m.id === id);
      if (!m) throw new Error("教材が見つかりません");
      if (m.subject_id !== subject_id && b.units.some((u) => u.material_id === id))
        throw new Error("学習記録のある教材は科目を変更できません");
      if (b.settings.last_material_id === id) b.settings.last_subject_id = subject_id;
      Object.assign(m, { name, subject_id });
    } else b.materials.push({ id: crypto.randomUUID(), name, subject_id });
  });
}
export function deleteCatalog(kind: "subject" | "material", id: string) {
  return changeLocal((b) => {
    if (b.units.some((u) => (kind === "subject" ? u.subject_id === id : u.material_id === id)))
      throw new Error("学習記録があるため削除できません");
    if (kind === "subject") {
      if (b.materials.some((m) => m.subject_id === id))
        throw new Error("教材がある科目は削除できません。先に教材を確認してください");
      b.subjects = b.subjects.filter((s) => s.id !== id);
      if (b.settings.last_subject_id === id)
        b.settings = { last_subject_id: null, last_material_id: null };
    } else {
      b.materials = b.materials.filter((m) => m.id !== id);
      if (b.settings.last_material_id === id) b.settings.last_material_id = null;
    }
  });
}
