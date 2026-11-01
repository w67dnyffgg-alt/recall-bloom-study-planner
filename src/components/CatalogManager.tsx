import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useLocalState } from "@/lib/data";
import { saveSubject, saveMaterial, deleteCatalog } from "@/lib/catalog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export const selectClass =
  "h-11 w-full min-w-0 rounded-2xl border border-input bg-card px-3 text-sm";
export function CatalogManager() {
  const { data } = useLocalState();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [material, setMaterial] = useState("");
  const [parent, setParent] = useState("");
  const [editingSubject, setEditingSubject] = useState<string>();
  const [editingMaterial, setEditingMaterial] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await qc.invalidateQueries();
      toast.success("保存しました");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存できませんでした");
    } finally {
      setBusy(false);
    }
  }
  if (!data) return null;
  return (
    <section className="glass rounded-3xl p-5 space-y-4">
      <h2 className="font-semibold">科目・教材管理</h2>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await saveSubject(subject, editingSubject);
            setSubject("");
            setEditingSubject(undefined);
          });
        }}
      >
        <Input
          aria-label="科目名"
          placeholder="科目名"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <Button disabled={busy}>{editingSubject ? "更新" : "科目追加"}</Button>
      </form>
      <ul className="space-y-2">
        {data.data.subjects.map((s) => (
          <li key={s.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 break-all">{s.name}</span>
            <Button
              variant="ghost"
              onClick={() => {
                setEditingSubject(s.id);
                setSubject(s.name);
              }}
            >
              編集
            </Button>
            <Button
              variant="ghost"
              disabled={
                busy ||
                data.data.units.some((u) => u.subject_id === s.id) ||
                data.data.materials.some((m) => m.subject_id === s.id)
              }
              onClick={() =>
                confirm(`科目「${s.name}」を削除しますか？`) &&
                void run(() => deleteCatalog("subject", s.id))
              }
            >
              削除
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await saveMaterial(material, parent, editingMaterial);
            setMaterial("");
            setEditingMaterial(undefined);
          });
        }}
      >
        <label className="text-sm">
          教材の科目
          <select
            className={selectClass}
            required
            value={parent}
            onChange={(e) => setParent(e.target.value)}
          >
            <option value="">選択してください</option>
            {data.data.subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <Input
            aria-label="教材名"
            required
            placeholder="教材名"
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          />
          <Button disabled={busy}>{editingMaterial ? "更新" : "教材追加"}</Button>
        </div>
      </form>
      {(editingSubject || editingMaterial) && (
        <Button
          variant="outline"
          onClick={() => {
            setEditingMaterial(undefined);
            setEditingSubject(undefined);
            setSubject("");
            setMaterial("");
          }}
        >
          編集をキャンセル
        </Button>
      )}
      <ul className="space-y-2">
        {data.data.materials.map((m) => (
          <li key={m.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 break-all">
              {data.data.subjects.find((s) => s.id === m.subject_id)?.name} / {m.name}
            </span>
            <Button
              variant="ghost"
              onClick={() => {
                setEditingMaterial(m.id);
                setMaterial(m.name);
                setParent(m.subject_id);
              }}
            >
              編集
            </Button>
            <Button
              variant="ghost"
              disabled={busy || data.data.units.some((u) => u.material_id === m.id)}
              onClick={() =>
                confirm(`教材「${m.name}」を削除しますか？`) &&
                void run(() => deleteCatalog("material", m.id))
              }
            >
              削除
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        記録のある科目・教材は削除できません。名前を変えても記録との紐づけは残ります。
      </p>
    </section>
  );
}
