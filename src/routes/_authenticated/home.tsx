import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/AppShell";
import { ReviewItem } from "@/components/ReviewItem";
import { Button } from "@/components/ui/button";
import { startOfDay, useLogs, useUnits, fmtDateTime } from "@/lib/data";
import { INTERVAL_LABELS } from "@/lib/srs";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "ホーム | Rememo" }] }),
  component: HomePage,
});

function Stat({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="glass rounded-3xl p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">
        {value}
        {suffix && <span className="text-sm ml-1 text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        {title}
        <span className="rounded-full bg-accent px-2 text-xs text-accent-foreground">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function HomePage() {
  const units = useUnits();
  const logs = useLogs();

  const { overdue, today, upcoming } = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now).getTime();
    const tomorrow = todayStart + 86400000;
    const active = (units.data ?? []).filter((u) => u.next_review_at);
    const sorted = [...active].sort((a, b) => +new Date(a.next_review_at!) - +new Date(b.next_review_at!));
    return {
      overdue: sorted.filter((u) => +new Date(u.next_review_at!) < todayStart),
      today: sorted.filter((u) => {
        const t = +new Date(u.next_review_at!);
        return t >= todayStart && t < tomorrow;
      }),
      upcoming: sorted.filter((u) => +new Date(u.next_review_at!) >= tomorrow).slice(0, 8),
    };
  }, [units.data]);

  const done = logs.data?.length ?? 0;
  const rate = done + overdue.length === 0 ? 0 : Math.round((done / (done + overdue.length)) * 100);

  if (units.isLoading) return <p className="text-muted-foreground">読み込み中…</p>;

  return (
    <div>
      <PageHeader
        sub="Today"
        title={new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
        action={
          <Button asChild>
            <Link to="/units" search={{ new: true }}>
              <Plus /> 学習を記録
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Stat label="今日の復習" value={today.length} suffix="件" />
        <Stat label="期限切れ" value={overdue.length} suffix="件" />
        <Stat label="学習済み単元" value={units.data?.length ?? 0} suffix="単元" />
        <Stat label="復習完了率" value={rate} suffix="%" />
      </div>

      {overdue.length > 0 && (
        <Section title="期限を過ぎた復習" count={overdue.length}>
          <div className="grid gap-3 lg:grid-cols-2">
            {overdue.map((u) => (
              <ReviewItem key={u.id} unit={u} overdue />
            ))}
          </div>
        </Section>
      )}

      <Section title="今日の復習" count={today.length}>
        {today.length === 0 ? (
          <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">
            今日の復習はありません。ゆっくり休みましょう ☕️
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {today.map((u) => (
              <ReviewItem key={u.id} unit={u} actionable={+new Date(u.next_review_at!) <= Date.now() + 3600000 * 24} />
            ))}
          </div>
        )}
      </Section>

      <Section title="今後の復習予定" count={upcoming.length}>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">予定はまだありません。</p>
        ) : (
          <ul className="glass rounded-3xl divide-y divide-border/60">
            {upcoming.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.unit_name}</p>
                  <p className="text-xs text-muted-foreground">{u.subject}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs">{fmtDateTime(u.next_review_at!)}</p>
                  <p className="text-[11px] text-muted-foreground">{INTERVAL_LABELS[u.stage]}の復習</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
