import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtDateTime, useDeleteUnit, useSaveUnit, useUnits, type Unit } from "@/lib/data";
import { isLocalMode } from "@/lib/storage-mode";
import { saveSubject, saveMaterial } from "@/lib/catalog";
import { selectClass } from "@/components/CatalogManager";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalState, useLogs } from "@/lib/data";
import { FINAL_STAGE, INTERVAL_LABELS, RESULT_LABELS } from "@/lib/srs";

export const Route = createFileRoute("/_authenticated/units")({
  validateSearch: (s: Record<string, unknown>): { new?: boolean } =>
    s["new"] === true || s["new"] === "true" ? { new: true } : {},
  head: () => ({ meta: [{ title: "学習記録 | Rememo" }] }),
  component: UnitsPage,
});

function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function UnitForm({ unit, onDone }: { unit?: Unit | undefined; onDone: () => void }) {
  const save = useSaveUnit();
  const local = isLocalMode();
  const catalog = useLocalState();
  const qc = useQueryClient();
  const b = catalog.data?.data;
  const [adding, setAdding] = useState<"subject" | "material" | null>(null);
  const [newName, setNewName] = useState("");
  const [addingBusy, setAddingBusy] = useState(false);
  const [f, setF] = useState({
    subject_id: unit?.subject_id ?? b?.settings.last_subject_id ?? "",
    material_id: unit?.material_id ?? b?.settings.last_material_id ?? "",
    subject: unit?.subject ?? "",
    material: unit?.material ?? "",
    unit_name: unit?.unit_name ?? "",
    pages: unit?.pages ?? "",
    memo: unit?.memo ?? "",
    studied_at: toLocalInput(unit ? new Date(unit.studied_at) : new Date()),
  });
  const set =
    (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!(local ? f.subject_id && f.material_id : f.subject.trim()) || !f.unit_name.trim()) {
      toast.error("科目・教材と単元名を入力してください");
      return;
    }
    try {
      await save.mutateAsync({
        id: unit?.id,
        input: {
          ...f,
          subject: local ? (b?.subjects.find((s) => s.id === f.subject_id)?.name ?? "") : f.subject,
          material: local
            ? (b?.materials.find((m) => m.id === f.material_id)?.name ?? "")
            : f.material,
          studied_at: new Date(f.studied_at),
        },
      });
      toast.success(unit ? "更新しました" : "記録しました。1時間後に最初の復習です");
      onDone();
    } catch {
      toast.error("保存できませんでした");
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {local ? (
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            科目名 *
            <select
              className={selectClass}
              required
              value={f.subject_id}
              onChange={(e) => setF({ ...f, subject_id: e.target.value, material_id: "" })}
            >
              <option value="">選択してください</option>
              {b?.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            教材名 *
            <select
              className={selectClass}
              required
              disabled={!f.subject_id}
              value={f.material_id}
              onChange={(e) => setF({ ...f, material_id: e.target.value })}
            >
              <option value="">選択してください</option>
              {b?.materials
                .filter((m) => m.subject_id === f.subject_id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAdding("subject");
                setNewName("");
              }}
            >
              科目を追加
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!f.subject_id}
              onClick={() => {
                setAdding("material");
                setNewName("");
              }}
            >
              教材を追加
            </Button>
          </div>
          {adding && (
            <div className="grid gap-2 rounded-xl border p-3">
              <Input
                aria-label={adding === "subject" ? "追加する科目名" : "追加する教材名"}
                placeholder={adding === "subject" ? "新しい科目名" : "新しい教材名"}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  disabled={addingBusy || !newName.trim()}
                  onClick={async () => {
                    setAddingBusy(true);
                    try {
                      const state =
                        adding === "subject"
                          ? await saveSubject(newName)
                          : await saveMaterial(newName, f.subject_id);
                      if (adding === "subject")
                        setF({ ...f, subject_id: state.data.subjects.at(-1)!.id, material_id: "" });
                      else setF({ ...f, material_id: state.data.materials.at(-1)!.id });
                      await qc.invalidateQueries();
                      setAdding(null);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "追加できませんでした");
                    } finally {
                      setAddingBusy(false);
                    }
                  }}
                >
                  追加して選択
                </Button>
                <Button type="button" variant="ghost" onClick={() => setAdding(null)}>
                  キャンセル
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>科目名 *</Label>
            <Input value={f.subject} onChange={set("subject")} placeholder="例：民法" />
          </div>
          <div className="grid gap-1.5">
            <Label>教材名</Label>
            <Input value={f.material} onChange={set("material")} placeholder="例：基本テキスト" />
          </div>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label>単元名 *</Label>
        <Input value={f.unit_name} onChange={set("unit_name")} placeholder="例：第3章 意思表示" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>ページ数</Label>
          <Input value={f.pages} onChange={set("pages")} placeholder="例：45-62" />
        </div>
        <div className="grid gap-1.5">
          <Label>学習日時</Label>
          <Input type="datetime-local" value={f.studied_at} onChange={set("studied_at")} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>メモ</Label>
        <Textarea
          value={f.memo}
          onChange={set("memo")}
          rows={3}
          placeholder="ポイントや苦手なところ"
        />
      </div>
      <Button type="submit" size="lg" disabled={save.isPending}>
        {unit ? "更新する" : "記録する"}
      </Button>
    </form>
  );
}

function UnitsPage() {
  const { new: openNew } = Route.useSearch();
  const navigate = useNavigate();
  const units = useUnits();
  const logs = useLogs();
  const state = useLocalState();
  const local = isLocalMode();
  const [folderSubject, setFolderSubject] = useState("");
  const [folderMaterial, setFolderMaterial] = useState("");
  const del = useDeleteUnit();
  const [editing, setEditing] = useState<Unit | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (openNew) {
      setEditing(null);
      setOpen(true);
      navigate({ to: "/units", search: () => ({}), replace: true });
    }
  }, [openNew, navigate]);

  const list = (units.data ?? []).filter(
    (u) =>
      (!folderSubject || u.subject_id === folderSubject) &&
      (!folderMaterial || u.material_id === folderMaterial) &&
      [u.subject, u.material, u.unit_name, u.memo]
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        sub="Records"
        title="学習記録"
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus /> 追加
          </Button>
        }
      />
      <Input
        className="mb-6 glass rounded-full h-11 px-5"
        placeholder="検索"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {local && (
        <section className="glass rounded-3xl p-4 mb-6 space-y-2">
          <h2 className="font-semibold">科目別フォルダ</h2>
          <Button
            variant="ghost"
            onClick={() => {
              setFolderSubject("");
              setFolderMaterial("");
            }}
          >
            すべての記録
          </Button>
          {state.data?.data.subjects.map((s) => (
            <details key={s.id} className="border-t py-2">
              <summary className="cursor-pointer py-2 text-sm">
                {s.name}（{units.data?.filter((u) => u.subject_id === s.id).length ?? 0}単元）
              </summary>
              <Button
                variant="ghost"
                onClick={() => {
                  setFolderSubject(s.id);
                  setFolderMaterial("");
                }}
              >
                {s.name}のすべて
              </Button>
              {state.data?.data.materials
                .filter((m) => m.subject_id === s.id)
                .map((m) => (
                  <Button
                    className="flex w-full justify-start pl-5"
                    key={m.id}
                    variant="ghost"
                    onClick={() => {
                      setFolderSubject(s.id);
                      setFolderMaterial(m.id);
                    }}
                  >
                    {m.name}（{units.data?.filter((u) => u.material_id === m.id).length ?? 0}単元）
                  </Button>
                ))}
            </details>
          ))}
          {folderSubject && (
            <p className="text-xs">
              表示中：{state.data?.data.subjects.find((s) => s.id === folderSubject)?.name}{" "}
              {folderMaterial &&
                ` / ${state.data?.data.materials.find((m) => m.id === folderMaterial)?.name}`}
            </p>
          )}
        </section>
      )}
      {units.isError && (
        <p role="alert" className="text-destructive">
          読み込みに失敗しました。データは消去せず、再読み込みしてください。
        </p>
      )}
      {units.isLoading ? (
        <p className="text-muted-foreground">読み込み中…</p>
      ) : list.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
          まだ記録がありません。学習した単元を追加しましょう。
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((u) => (
            <article key={u.id} className="glass rounded-3xl p-5">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {u.subject}
                    {u.material && ` ・ ${u.material}`}
                  </p>
                  <h3 className="font-semibold mt-1">{u.unit_name}</h3>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="編集"
                    onClick={() => {
                      setEditing(u);
                      setOpen(true);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="削除"
                    onClick={() => confirm("この単元を削除しますか？") && del.mutate(u.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {u.pages && <span>p. {u.pages}</span>}
                <span>学習：{fmtDateTime(u.studied_at)}</span>
              </div>
              {u.memo && (
                <p className="mt-3 text-sm whitespace-pre-wrap text-foreground/80">{u.memo}</p>
              )}
              <div className="mt-4 flex items-center gap-1">
                {INTERVAL_LABELS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i < u.stage ? "bg-primary" : "bg-secondary"}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {u.stage >= FINAL_STAGE || !u.next_review_at
                  ? "すべての復習が完了"
                  : `次回：${fmtDateTime(u.next_review_at)}（${INTERVAL_LABELS[u.stage]}）`}
              </p>
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer py-2">
                  復習実施履歴（{logs.data?.filter((l) => l.unit_id === u.id).length ?? 0}件）
                </summary>
                <ul className="space-y-2">
                  {logs.data
                    ?.filter((l) => l.unit_id === u.id)
                    .map((l) => (
                      <li key={l.id}>
                        {fmtDateTime(l.reviewed_at)} · {RESULT_LABELS[l.result]}
                      </li>
                    ))}
                </ul>
              </details>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass rounded-3xl sm:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "記録を編集" : "学習を記録"}</DialogTitle>
          </DialogHeader>
          {(!local || state.data) && (
            <UnitForm
              key={editing?.id ?? "new"}
              unit={editing ?? undefined}
              onDone={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
