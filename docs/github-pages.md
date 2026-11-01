# GitHub Pagesへの公開

## 現在の構成

公開用コードは `codex/github-pages` ブランチです。ログイン・アプリ用サーバー・外部DBを使わない静的Webアプリです。学習データはSafariなどのブラウザのIndexedDBに保存し、JSONでバックアップ・復元できます。

GitHubリポジトリの非公開設定、既存の `main`、Lovableの公開サイト・クラウドデータは変更していません。既存データの移行完了はまだ確認されていないため、旧クラウド向けのコードは削除せず、公開用ビルドから除外しています。

## 費用と非公開リポジトリの条件

GitHub FreeのGitHub Pagesは公開リポジトリで利用できます。非公開リポジトリから公開するには、GitHub Pro / Team / Enterprise等の対応プランが必要です。**「GitHub Free」「リポジトリ非公開」「GitHub Pages」の3条件を同時に満たせるとは限りません。** 教育向けなどの付与プランがある場合もGitHubのSettingsで確認してください。

利用者から非公開を維持する指示があるため、公開範囲を勝手に変更しません。Pagesを利用できない場合は、非公開を優先するか、利用者が明示的に公開範囲の変更を許可するかを確認してから進めます。リポジトリを公開するとコードとGit履歴が公開されるため、履歴を含む内容の確認なしに設定変更しません。

### 無料とソース非公開を両立する方法

元の非公開リポジトリはそのままにし、**ビルド済み配信ファイルだけを置く公開リポジトリを別に作る**方法があります。GitHub Freeでもその公開リポジトリのPagesを利用できます。配信されるHTML・CSS・JavaScriptは通常のWebサイトでも閲覧可能なファイルです。元のGit履歴・設定ファイル・認証情報・学習データはコピーしません。

このアプリは相対アセットとハッシュURLを使うため、配信先のリポジトリ名が変わっても再設定なしで利用できます。`pages-dist/` の中身と `.nojekyll` を配信専用リポジトリの公開ブランチに保存し、PagesのSourceをDeploy from a branch、フォルダをrootにするだけです。利用者が許可した後にCodexでビルド・保存を行います。公開用リポジトリの新規作成や既存リポジトリの公開範囲変更は、利用者の明示的な承認前には実行しません。

以下のActions設定は、現在のリポジトリ自体でPagesが利用可能な場合の方式です。別の配信専用リポジトリを使う場合はそちらのブランチ配信を使い、元リポジトリの公開ジョブを実行する必要はありません。公開リポジトリへの保存前にも、配信物にソースマップ・秘密情報・バックアップがないことを確認します。

公式条件：https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

## 必要なファイル

- `standalone/index.html` / `standalone/src/main.tsx`：静的アプリの入口。
- `vite.static.config.ts`：静的ビルド。`base: "./"` なのでユーザー名やリポジトリ名を書き換える必要がありません。
- `src/standalone/router.tsx`：`#/home`、`#/units` 等のハッシュ形式で画面を切り替えます。
- `scripts/prepare-static.mjs`：配信ファイルの検査と `.nojekyll` の作成。
- `.github/workflows/github-pages.yml`：テスト・ビルド・GitHub Pages配信。
- `.node-version`：Node 24。Actions内でBun 1.3.3を固定して依存導入。
- `pages-dist/`：生成される配信物。コード管理や手動コミットは不要です。

ハッシュ形式なので、GitHub Pagesにサーバーのリダイレクト設定やSPA用の404回避スクリプトは不要です。例えばプロジェクトの公開URLが `https://USER.github.io/REPOSITORY/` の場合、学習記録のURLは `https://USER.github.io/REPOSITORY/#/units` になります。この形式で再読み込み・ブックマークができます。実際のURLは公開成功後に確認します。

`.env`、ソースマップ、JSONバックアップ、クラウドSDK・接続情報は配信しません。HTMLのContent Security Policyでも外部APIへの通信を制限します。デザイン維持のためGoogle Fontsの読み込みは残しますが、学習データは送信しません。

## 初回公開（Codex向けの作業メモ）

初心者の利用者に以下をまとめて依頼せず、一度に一操作ずつ案内してください。依存導入・ビルド・コミット・プッシュはCodexが実施します。

1. 対象リポジトリの **Settings → Pages** で、現在のプランで利用可能か確認。
2. 利用可能な場合、Build and deploymentのSourceに **GitHub Actions** を選択。Settings → Environmentsに `github-pages` の公開ブランチ制限がある場合は `codex/github-pages` を許可。
3. 公開準備が確認できたら、Codexが専用ブランチに `[publish-pages]` で始まるコミットをプッシュ。
4. Actionsの「Build and publish GitHub Pages」が成功したことを確認。deployジョブの `page_url` を実際の公開URLとして案内。
5. Mac・iPhoneのSafariで動作を確認。必要なら後の一操作で「ホーム画面に追加」を案内。

通常のコミットのプッシュはテスト・ビルドと成果物の保存までです。`[publish-pages]` を付けない限り公開ジョブは動きません。コード保存だけで意図しない公開をしないための区別です。公開後の更新もCodexが同じ専用ブランチにリリースコミットをプッシュします。

`workflow_dispatch` でも公開できますが、GitHubのRun workflowボタンは原則としてデフォルトブランチにもワークフローが存在する必要があります。現在はLovable連携の `main` を変更せず、専用ブランチへのリリースコミットで動かす方式を使います。`gh-pages` ブランチやAPIキーを手動で作る必要はありません。Actionsに用意されるトークンを使い、公開ジョブだけに `pages: write` と `id-token: write` を付与します。

GitHub Pages用のActionsをまだ一度も実行していない場合や、権限・プランで実行できない場合は、ローカルの検証成功とGitHub上の成功を区別して報告します。Pagesの有効化や外部サイトの公開はコード準備とは別の段階です。

## Codexでの開発・検証

```sh
bun install --frozen-lockfile
bun run dev
bun run test
./node_modules/.bin/tsc --noEmit
bun run build
bun run preview:pages
```

通常の `dev`・`build`・`preview` は静的アプリです。旧コードの確認が必要な場合だけ `dev:legacy`・`build:legacy`・`preview:legacy` を使います。旧クラウド側での削除・変更を伴うテストは実行しません。

## データ保持と手動同期

MacとiPhoneはそれぞれ独立したIndexedDBです。バックアップをiCloud Driveなどに保存し、別端末で同じJSONを復元してください。既存の競合検出と上書き確認は維持しています。

保存領域はURLのオリジン（プロトコル・ホスト・ポート）単位です。同じGitHubユーザーの他のプロジェクトサイトも同じオリジンになるため、同じアプリの複数コピーを運用しないでください。ローカルMac・Lovable・Cloudflare・GitHub Pages間はJSONで移行します。新しいURLで空の画面が出ても、元データが消えたとは限りません。元のURLを残し、移行前にJSONを確保してください。

コード更新ではIndexedDBを削除しません。通常のSafariウインドウで同じ本番URLを利用し、ブラウザのサイトデータ削除やOSによる消去に備えてバックアップを継続してください。PWAによる完全なオフライン起動・自動同期は今回の対象外です。
