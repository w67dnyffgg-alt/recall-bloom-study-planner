# Bloom Study Planner / Rememo

忘却曲線と間隔反復学習を使った個人用の復習管理アプリです。現在の開発はCodexで行い、GitHub Pagesに静的ファイルとして公開する構成です。

- ログイン不要、IndexedDBによる端末内保存
- 科目・教材の事前登録、選択式の学習記録
- 理解度に応じた復習予定、今日の復習、カレンダー、進捗表示
- JSONバックアップ・復元・競合を検知する統合
- Mac・iPhone・iPadのSafari向けのレスポンシブUI

[GitHub Pagesの公開設定・費用条件・データ保持](docs/github-pages.md)を参照してください。公開作業はCodex側で進め、利用者に必要な操作は一度に一つずつ案内します。GitHub Freeでリポジトリを非公開のままPages公開できるとは限らないため、公開範囲の変更やプラン契約は勝手に行いません。

## 開発（Codex向け）

Node 24、Bun 1.3.3を使用します。

```sh
bun install --frozen-lockfile
bun run dev
bun run test
bun run build
bun run preview:pages
```

配信するのは `pages-dist/` のみです。認証情報・学習データ・バックアップJSONは配信に含めません。GitHub Actionsが専用ブランチ `codex/github-pages` のテストとビルドを行い、`[publish-pages]` で始まるリリースコミットのみ公開します。

## 既存データ

Lovableの公開サイト・クラウドデータは変更していません。旧コードは安全な移行のため残していますが、静的アプリにはクラウドSDKやログイン処理を組み込みません。必要な場合のみ `dev:legacy` 等で旧コードを確認できます。

[段階移行の手順](docs/local-migration.md)も参照してください。新しい公開URLでは元のサイトと保存領域が異なるため、自動移行はされません。実利用データの移行完了は利用者本人が確認するまで未完了として扱います。
