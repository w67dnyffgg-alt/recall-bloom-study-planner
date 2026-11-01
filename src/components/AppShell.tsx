import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Home, BookOpen, CalendarDays, LogOut, Sparkles, Settings } from "lucide-react";
import { isLocalMode, switchStorageMode } from "@/lib/storage-mode";
import { useLocalState } from "@/lib/data";
import { backupDue } from "@/lib/local-store";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/home", label: "ホーム", icon: Home },
  { to: "/units", label: "学習記録", icon: BookOpen },
  { to: "/calendar", label: "カレンダー", icon: CalendarDays },
  { to: "/settings", label: "設定", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const local = isLocalMode();
  const state = useLocalState();
  useEffect(() => {
    if (!local) return;
    const refresh = () => {
      void qc.invalidateQueries();
    };
    window.addEventListener("rememo-data", refresh);
    const channel =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("rememo-data") : null;
    if (channel) channel.onmessage = refresh;
    return () => {
      window.removeEventListener("rememo-data", refresh);
      channel?.close();
    };
  }, [local, qc]);
  async function signOut() {
    if (local) {
      switchStorageMode("cloud");
      return;
    }
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col gap-2 p-5 sticky top-0 h-dvh">
        <div className="flex items-center gap-2 px-3 py-4">
          <span className="jelly-pink grid size-9 place-items-center rounded-2xl">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-wide">Rememo</span>
        </div>
        <nav className="glass rounded-3xl p-2 flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-accent/60"
              activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="mt-auto flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:bg-accent/60"
        >
          <LogOut className="size-4" /> {local ? "既存クラウドへ" : "ログアウト"}
        </button>
      </aside>

      <main className="flex-1 min-w-0 px-5 pt-8 pb-32 md:px-10 md:pb-12 md:pt-10 max-w-5xl mx-auto w-full">
        <div className="flex justify-end md:hidden -mt-2 mb-2">
          <button
            onClick={signOut}
            className="text-xs text-muted-foreground flex items-center gap-1"
          >
            <LogOut className="size-3.5" /> {local ? "既存クラウドへ" : "ログアウト"}
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          {local ? "端末内保存 · このブラウザに保存" : "既存クラウド · 移行前のデータ"}
        </p>
        {local && state.isError && (
          <p role="alert" className="glass rounded-2xl p-4 mb-4">
            端末内データを読み込めません。再読み込みしてください。データを消去しないでください。
          </p>
        )}
        {local && state.data && backupDue(state.data.lastBackupAt) && (
          <Link to="/settings" className="block glass rounded-2xl p-4 mb-5 text-sm">
            {state.data.lastBackupAt
              ? "前回のバックアップから7日以上経過しています。"
              : "まだバックアップがありません。"}
            設定の「データ管理」からバックアップを作成してください。
          </Link>
        )}
        {children}
      </main>

      <nav className="md:hidden fixed inset-x-4 bottom-0 z-40 safe-bottom">
        <div className="glass rounded-full p-1.5 flex justify-around">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 text-[11px] text-muted-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground font-semibold" }}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex items-end justify-between gap-4">
      <div>
        {sub && (
          <p className="text-xs tracking-[0.2em] text-primary font-display uppercase mb-1">{sub}</p>
        )}
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
      </div>
      {action}
    </header>
  );
}
