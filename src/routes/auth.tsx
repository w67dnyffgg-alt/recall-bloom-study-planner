import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { isLocalMode, switchStorageMode } from "@/lib/storage-mode";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "ログイン | Rememo" },
      {
        name: "description",
        content: "Rememoにログインして、学習記録と復習予定をどの端末からでも確認できます。",
      },
      { property: "og:title", content: "ログイン | Rememo" },
      { property: "og:description", content: "忘却曲線にもとづく復習管理アプリ Rememo" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLocalMode()) {
      void navigate({ to: "/home", replace: true });
      return;
    }
    supabase.auth.getSession().then(({ data }) => data.session && navigate({ to: "/home" }));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => s && navigate({ to: "/home" }));
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/home" },
        });
        if (error) throw error;
        toast.success("確認メールを送信しました。メール内のリンクから登録を完了してください。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setBusy(false);
    }
  }

  async function social(p: "google" | "apple") {
    const r = await lovable.auth.signInWithOAuth(p, {
      redirect_uri: window.location.origin + "/auth",
    });
    if (r.error) toast.error("ログインできませんでした");
  }

  return (
    <div className="min-h-dvh grid place-items-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="jelly-pink inline-grid size-14 place-items-center rounded-3xl mb-4">
            <Sparkles className="size-6" />
          </span>
          <h1 className="font-display text-3xl font-semibold">Rememo</h1>
          <p className="text-sm text-muted-foreground mt-2">忘れる前に、そっと思い出す。</p>
        </div>
        <div className="glass rounded-[2rem] p-6 space-y-4">
          <Button className="w-full" onClick={() => switchStorageMode("local")}>
            ログインせず端末内で使う
          </Button>
          <p className="text-xs text-muted-foreground">
            以下は既存クラウドデータの利用・移行用です。設定画面からJSONを書き出せます。
          </p>
          <Button variant="outline" className="w-full" onClick={() => social("apple")}>
            Appleで続ける
          </Button>
          <Button variant="outline" className="w-full" onClick={() => social("google")}>
            Googleで続ける
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            または
            <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} className="space-y-3">
            <Input
              type="email"
              required
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-2xl bg-card"
            />
            <Input
              type="password"
              required
              minLength={6}
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-2xl bg-card"
            />
            <Button type="submit" className="w-full" size="lg" disabled={busy}>
              {mode === "in" ? "ログイン" : "新規登録"}
            </Button>
          </form>
          <button
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "in"
              ? "アカウントをお持ちでない方はこちら"
              : "すでにアカウントをお持ちの方はこちら"}
          </button>
        </div>
      </div>
    </div>
  );
}
