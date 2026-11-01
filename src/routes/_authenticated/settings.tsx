import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { CatalogManager } from "@/components/CatalogManager";
import { Button } from "@/components/ui/button";
import { isLocalMode, switchStorageMode } from "@/lib/storage-mode";
import { useLocalState } from "@/lib/data";
import { exportCloud, downloadBackup } from "@/lib/cloud-export";
import { parseBackup, mergeBackups, type Backup } from "@/lib/local-model";
import { readLocal, restoreLocal, markBackup, markMigrationChecked } from "@/lib/local-store";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "設定 | Rememo" }] }),
  component: SettingsPage,
});
function timestamp(s: string | null) {
  return s
    ? new Date(s).toLocaleString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "未作成";
}
function Summary({ b }: { b: Backup }) {
  return (
    <dl className="grid gap-1 text-sm">
      <div>作成日時：{timestamp(b.created_at)}</div>
      <div>
        科目：{b.subjects.length} ／ 教材：{b.materials.length}
      </div>
      <div>
        学習記録：{b.units.length} ／ 復習予定：{b.units.filter((u) => u.next_review_at).length} ／
        復習履歴：{b.logs.length}
      </div>
    </dl>
  );
}
function SettingsPage() {
  const local = isLocalMode();
  const state = useLocalState();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cloudBackup, setCloudBackup] = useState<Backup>();
  const [pending, setPending] = useState<{ b: Backup; revision: number; existing: Backup }>();
  const [restoreMode, setRestoreMode] = useState<"merge" | "replace">("merge");
  const [confirmed, setConfirmed] = useState(false);
  const [savedBeforeReplace, setSavedBeforeReplace] = useState(false);
  const [verified, setVerified] = useState(false);
  const [result, setResult] = useState<Backup>();
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await qc.invalidateQueries();
    } catch (e) {
      setError(e instanceof Error ? e.message : "処理できませんでした");
    } finally {
      setBusy(false);
    }
  }
  async function backup() {
    await run(async () => {
      const b = local ? structuredClone((await readLocal()).data) : await exportCloud();
      b.created_at = new Date().toISOString();
      downloadBackup(b);
      if (local) await markBackup(b.created_at);
      else setCloudBackup(b);
      toast.success("バックアップファイルのダウンロードを開始しました。保存先を確認してください");
    });
  }
  let conflict = "";
  if (pending && restoreMode === "merge") {
    try {
      mergeBackups(pending.existing, pending.b);
    } catch (e) {
      conflict = e instanceof Error ? e.message : "統合できません";
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader title="設定" sub="Settings" />
      {local && <CatalogManager />}
      <section className="glass rounded-3xl p-5 space-y-4">
        <h2 className="font-semibold">データ管理</h2>
        <p className="text-sm text-muted-foreground">
          {local
            ? "このブラウザのIndexedDBに保存しています。サイトデータの削除や端末故障に備えてバックアップしてください。"
            : "クラウドの学習記録・復習履歴を全件取得してJSONに書き出します。クラウドの削除や書き換えは行いません。他端末での編集を止めてから実行してください。"}
        </p>
        {local && (
          <p className="text-sm">最終バックアップ：{timestamp(state.data?.lastBackupAt ?? null)}</p>
        )}
        <Button disabled={busy || (local && !state.data)} onClick={() => void backup()}>
          {busy ? "処理中…" : local ? "バックアップを作成" : "既存クラウドデータをJSONエクスポート"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Safariのダウンロード、または「共有 → ファイルに保存」でiCloud
          Driveを選んでください。アプリからiCloudへの自動保存や実際の保存完了の検知はできません。最終日時はファイル生成・ダウンロード開始時に更新します。JSONには学習メモも含まれます。
        </p>
        {cloudBackup && (
          <div role="status">
            <Summary b={cloudBackup} />
            <p className="mt-3 text-sm">
              ファイルが保存できたら端末内モードに切り替え、同じJSONを選択してください。
            </p>
            <Button className="mt-3" onClick={() => switchStorageMode("local")}>
              端末内モードに進む
            </Button>
          </div>
        )}
        {local && (
          <label className="grid gap-2 text-sm">
            バックアップから復元
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy}
              className="block w-full rounded-xl border p-3"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                setPending(undefined);
                setConfirmed(false);
                setSavedBeforeReplace(false);
                setResult(undefined);
                if (!file) return;
                void run(async () => {
                  if (file.size > 50 * 1024 * 1024)
                    throw new Error("ファイルが大きすぎます（上限50MB）");
                  const b = parseBackup(JSON.parse(await file.text()));
                  const current = await readLocal();
                  setRestoreMode("merge");
                  setPending({ b, revision: current.revision, existing: current.data });
                });
              }}
            />
          </label>
        )}
        {pending && (
          <div className="rounded-2xl border p-4 space-y-4" role="region" aria-label="復元の確認">
            <h3 className="font-semibold">読み込むバックアップ</h3>
            <Summary b={pending.b} />
            <p className="text-sm">
              現在の端末：学習記録 {pending.existing.units.length}件 ／ 復習履歴{" "}
              {pending.existing.logs.length}件
            </p>
            <label className="block">
              <input
                type="radio"
                checked={restoreMode === "merge"}
                onChange={() => {
                  setRestoreMode("merge");
                  setConfirmed(false);
                }}
              />{" "}
              既存データと統合（重複IDを追加しない）
            </label>
            <label className="block">
              <input
                type="radio"
                checked={restoreMode === "replace"}
                onChange={() => {
                  setRestoreMode("replace");
                  setConfirmed(false);
                }}
              />{" "}
              既存データを置き換える
            </label>
            <p className="text-xs text-muted-foreground">
              統合は削除の同期を行いません。前回の科目・教材選択はこの端末の設定を維持します（空の端末には読み込みます）。同一IDの内容や復習履歴が競合する場合は統合を中止します。
            </p>
            {conflict && (
              <p role="alert" className="text-sm whitespace-pre-wrap text-destructive">
                {conflict}
              </p>
            )}
            {restoreMode === "replace" && (
              <>
                <p className="text-sm text-destructive">
                  端末内の科目・教材・記録・履歴・設定を置き換えます。まず現在のデータをバックアップしてください。クラウドは変更されません。
                </p>
                <label className="block text-sm">
                  <input
                    type="checkbox"
                    checked={savedBeforeReplace}
                    onChange={(e) => setSavedBeforeReplace(e.target.checked)}
                  />{" "}
                  現在のデータをファイルに保存済みです
                </label>
              </>
            )}
            <label className="block text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />{" "}
              件数と復元方式を確認しました
            </label>
            <Button
              disabled={
                busy ||
                !confirmed ||
                !!conflict ||
                (restoreMode === "replace" && !savedBeforeReplace)
              }
              onClick={() =>
                void run(async () => {
                  if (!pending) return;
                  const restored = await restoreLocal(pending.b, restoreMode, pending.revision);
                  setResult(restored.data);
                  setPending(undefined);
                  setVerified(false);
                  toast.success("復元しました。件数・学習記録・復習予定・履歴を確認してください");
                })
              }
            >
              確認した内容で復元する
            </Button>
            <Button variant="ghost" onClick={() => setPending(undefined)}>
              キャンセル
            </Button>
          </div>
        )}
        {result && (
          <div role="status" className="space-y-2">
            <h3 className="font-semibold">復元後のデータ（紐づけ・形式の検証済み）</h3>
            <Summary b={result} />
            <p className="text-sm">
              ホーム・学習記録・カレンダーで元のJSONと日時・内容を照合してください。復習予定は再計算せず引き継いでいます。
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm whitespace-pre-wrap text-destructive">
            {error}
          </p>
        )}
      </section>
      <section className="glass rounded-3xl p-5 space-y-4">
        <h2 className="font-semibold">安全な移行</h2>
        <ol className="list-decimal pl-5 text-sm space-y-2">
          <li>既存クラウドでログインし、JSONをエクスポートして保管</li>
          <li>端末内モードでJSONを読み込み、件数を確認して復元</li>
          <li>学習記録・復習予定・実施履歴を照合し、再読み込み後にも残ることを確認</li>
          <li>確認が済んでから、ログイン機能の最終廃止を依頼</li>
        </ol>
        {local && state.data && (
          <>
            <p className="text-sm">
              端末内：学習記録 {state.data.data.units.length}件 ／ 科目{" "}
              {state.data.data.subjects.length}件 ／ 復習履歴 {state.data.data.logs.length}件
            </p>
            <p className="text-sm">
              移行確認：
              {state.data.migrationCheckedAt ? timestamp(state.data.migrationCheckedAt) : "未確認"}
            </p>
            <label className="block text-sm">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
              />{" "}
              元データと件数・内容・予定・履歴を照合し、再読み込み後の保存も確認しました
            </label>
            <Button
              disabled={!verified || busy}
              onClick={() =>
                void run(async () => {
                  await markMigrationChecked();
                  toast.success("確認を記録しました。クラウドとログイン機能は引き続き保持します");
                })
              }
            >
              移行確認を記録する
            </Button>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          端末ごとのデータは独立しています。同じURL・同じブラウザで利用してください。iCloud
          DriveのJSONを別端末で復元すると手動同期できます。ログイン機能とクラウドのデータは、ご本人による移行確認まで残しています。
        </p>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => switchStorageMode(local ? "cloud" : "local")}
        >
          {local ? "既存クラウドに戻る" : "ログインせず端末内モードで使う"}
        </Button>
      </section>
    </div>
  );
}
