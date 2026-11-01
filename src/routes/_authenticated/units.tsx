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
import { FINAL_STAGE, INTERVAL_LABELS } from "@/lib/srs";

export const Route = createFileRoute("/_authenticated/units")({
  validateSearch: (s: Record<string, unknown>) => ({ new: s.new === true || s.new === "true" ? true : undefined }),
  head: () => ({ meta: [{ title: "学習記録 | Rememo" }] }),
  component: UnitsPage,
});

function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function UnitForm({ unit, onDone }: { unit?: Unit; onDone: () => void }) {
  const save = useSaveUnit();
  const [f, setF] = useState({
    subject: unit?.subject ?? "",
    material: unit?.material ?? "",
    unit_name: unit?.unit_name ?? "",
    pages: unit?.pages ?? "",
    memo: unit?.memo ?? "",
    studied_at: toLocalInput(unit ? new Date(unit.studied_at) : new Date()),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.subject.trim() || !f.unit_name.trim()) return toast.error("科目名と単元名は必須です");
    try {
      await save.mutateAsync({ id: unit?.id, input: { ...f, studied_at: new Date(f.studied_at) } });
      toast.success(unit ? "更新しました" : "記録しました。1時間後に最初の復習です");
      onDone();
    } catch {
      toast.error("保存できませんでした");
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
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
        <Textarea value={f.memo} onChange={set("memo")} rows={3} placeholder="ポイントや苦手なところ" />
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
  const del = useDeleteUnit();
  const [editing, setEditing] = useState<Unit | null>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (openNew) {
      setEditing(null);
      setOpen(true);
      navigate({ to: "/units", search: {}, replace: true });
    }
  }, [openNew, navigate]);

  const list = (units.data ?? []).filter((u) =>
    [u.subject, u.material, u.unit_name, u.memo].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        sub="Records"
        title="学習記録"
        action={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus /> 追加
          </Button>
        }
      />
      <Input className="mb-6 glass rounded-full h-11 px-5" placeholder="検索" value={q} onChange={(e) => setQ(e.target.value)} />

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
                    {u.subject}{u.material && ` ・ ${u.material}`}
                  </p>
                  <h3 className="font-semibold mt-1">{u.unit_name}</h3>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" aria-label="編集" onClick={() => { setEditing(u); setOpen(true); }}>
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
              {u.memo && <p className="mt-3 text-sm whitespace-pre-wrap text-foreground/80">{u.memo}</p>}
              <div className="mt-4 flex items-center gap-1">
                {INTERVAL_LABELS.map((_, i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i < u.stage ? "bg-primary" : "bg-secondary"}`} />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {u.stage >= FINAL_STAGE || !u.next_review_at
                  ? "すべての復習が完了"
                  : `次回：${fmtDateTime(u.next_review_at)}（${INTERVAL_LABELS[u.stage]}）`}
              </p>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "記録を編集" : "学習を記録"}</DialogTitle>
          </DialogHeader>
          <UnitForm key={editing?.id ?? "new"} unit={editing ?? undefined} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
