import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rememo — 忘却曲線で覚える復習管理アプリ" },
      { name: "description", content: "学習した単元を記録し、1時間後から30日後まで最適なタイミングで復習。資格試験の勉強に。" },
      { property: "og:title", content: "Rememo — 忘却曲線で覚える復習管理アプリ" },
      { property: "og:description", content: "間隔反復で、学んだことを長く記憶に。iPhone・iPad・Macで同期。" },
    ],
  }),
  component: Index,
});

const steps = ["1時間後", "1日後", "3日後", "7日後", "14日後", "30日後"];

function Index() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="jelly-pink grid size-16 place-items-center rounded-[1.75rem] mb-6">
        <Sparkles className="size-7" />
      </span>
      <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight">Rememo</h1>
      <p className="mt-4 max-w-md text-muted-foreground leading-relaxed">
        学んだ単元を記録するだけ。<br />忘れかけたころに、ちょうどよく復習をお知らせします。
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-2 max-w-lg">
        {steps.map((s, i) => (
          <span key={s} className="glass rounded-full px-4 py-2 text-sm" style={{ opacity: 1 - i * 0.08 }}>
            {s}
          </span>
        ))}
      </div>
      <Button asChild size="lg" className="mt-12">
        <Link to="/auth">はじめる</Link>
      </Button>
    </div>
  );
}
