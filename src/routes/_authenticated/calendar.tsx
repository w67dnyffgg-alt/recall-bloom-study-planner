import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { sameDay, startOfDay, useLogs, useUnits, fmtDateTime } from "@/lib/data";
import { INTERVAL_LABELS, RESULT_LABELS } from "@/lib/srs";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "カレンダー | Rememo" }] }),
  component: CalendarPage,
});

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

function CalendarPage() {
  const units = useUnits();
  const logs = useLogs();
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return startOfDay(d); });
  const [selected, setSelected] = useState(() => startOfDay(new Date()));

  const unitMap = useMemo(() => new Map((units.data ?? []).map((u) => [u.id, u])), [units.data]);
  const scheduled = (units.data ?? []).filter((u) => u.next_review_at);

  const days = useMemo(() => {
    const first = new Date(cursor);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [cursor]);

  const today = new Date();
  const daySched = scheduled.filter((u) => sameDay(new Date(u.next_review_at!), selected));
  const dayLogs = (logs.data ?? []).filter((l) => sameDay(new Date(l.reviewed_at), selected));

  const move = (n: number) => { const d = new Date(cursor); d.setMonth(d.getMonth() + n); setCursor(d); };

  return (
    <div>
      <PageHeader sub="Calendar" title="カレンダー" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="glass rounded-3xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <Button size="icon" variant="ghost" onClick={() => move(-1)} aria-label="前の月"><ChevronLeft /></Button>
            <p className="font-display font-semibold">
              {cursor.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
            </p>
            <Button size="icon" variant="ghost" onClick={() => move(1)} aria-label="次の月"><ChevronRight /></Button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground mb-2">
            {WEEK.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const s = scheduled.filter((u) => sameDay(new Date(u.next_review_at!), d)).length;
              const l = (logs.data ?? []).filter((x) => sameDay(new Date(x.reviewed_at), d)).length;
              const isSel = sameDay(d, selected);
              const isToday = sameDay(d, today);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelected(startOfDay(d))}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 text-sm transition-colors ${
                    isSel ? "jelly-pink" : isToday ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                  } ${inMonth ? "" : "opacity-35"}`}
                >
                  <span>{d.getDate()}</span>
                  <span className="flex gap-0.5 h-1.5">
                    {s > 0 && <span className={`size-1.5 rounded-full ${isSel ? "bg-primary-foreground" : "bg-primary"}`} />}
                    {l > 0 && <span className={`size-1.5 rounded-full ${isSel ? "bg-primary-foreground/60" : "bg-success"}`} />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-[11px] text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" />復習予定</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-success" />実施済み</span>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="font-semibold">
            {selected.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
          </h2>
          <div>
            <p className="text-xs text-muted-foreground mb-2">復習予定</p>
            {daySched.length === 0 ? <p className="text-sm text-muted-foreground">なし</p> : (
              <ul className="glass rounded-3xl divide-y divide-border/60">
                {daySched.map((u) => (
                  <li key={u.id} className="px-4 py-3">
                    <p className="text-sm font-medium">{u.unit_name}</p>
                    <p className="text-[11px] text-muted-foreground">{u.subject} ・ {INTERVAL_LABELS[u.stage]}の復習 ・ {fmtDateTime(u.next_review_at!)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">実施履歴</p>
            {dayLogs.length === 0 ? <p className="text-sm text-muted-foreground">なし</p> : (
              <ul className="glass rounded-3xl divide-y divide-border/60">
                {dayLogs.map((l) => (
                  <li key={l.id} className="px-4 py-3 flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{unitMap.get(l.unit_id)?.unit_name ?? "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{fmtDateTime(l.reviewed_at)}</p>
                    </div>
                    <span className="text-xs rounded-full bg-secondary px-2.5 py-1 h-fit shrink-0">{RESULT_LABELS[l.result]}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
