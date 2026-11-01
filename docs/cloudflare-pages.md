# Codexで開発する独立公開版

## 方針と現在の状態

Cloudflare Pages Free + 非公開GitHubの専用ブランチ `codex/standalone-pages` を使用する方針です。Lovableの公開サイト・クラウドデータ・連携ブランチ `main` は変更しません。公開サイトの作成・GitHub連携には利用者自身のCloudflareアカウントと連携承認が必要です。現時点ではローカル検証と配信用ファイル作成までで、Cloudflareへの公開はまだ行っていません。

標準の `*.pages.dev` URLを使うため独自ドメインの購入は不要です。公式資料上、静的アセットのリクエストは無料・回数無制限、Freeプランのビルド上限は月500回です。Functions、Workers、外部DB、有料ストレージは使用しません。将来のサービス規約変更まで保証するものではありません。

比較：GitHub Pagesは非公開リポジトリの公開に有料プランが必要となる場合があり、今回は選びません。ローカルMac起動はiPhoneからの利用やMacの常時起動が負担になるため、日常利用の方法にはしません。Cloudflare PagesのGit連携なら、最初の登録・承認後はCodexによる専用ブランチの更新で自動公開できます。

## 仕組み

`vite.pages.config.ts` と `standalone/index.html` から、独立したSPAを生成します。既存のホーム・学習記録・カレンダー・設定・IndexedDB・JSON復元・SRSを再利用します。LovableのViteプラグインやTanStack Startのサーバーは使用しません。

- `bun run build:pages`：配信用の `pages-dist/` を生成し、配信ファイルを検査。
- `bun run preview:pages`：生成済みファイルをローカル確認（Codex向け）。
- `.env` は読み込みません。クラウドSDKは、接続を拒否するスタブへビルド時に置き換えます。
- 初回から端末内モードで `/home` を表示。クラウドへの切替ボタンは非表示。`/auth` もホームへ移動します。
- 旧コードのログイン・クラウド移行機能やDBは削除していません。既存ビルドは別のまま残します。
- `_redirects` により `/units` や `/settings` の直アクセス・再読み込みに対応します。
- `_headers` で外部API通信と埋め込みを制限し、HTMLは再検証、ハッシュ付きアセットは長期キャッシュにします。Google Fontsへのフォント読込のみ許可します。
- 生のソース・`.env`・JSONバックアップ・ソースマップは配信しません。ブラウザが実行するJavaScriptとCSSは通常のWebアプリ同様に閲覧可能ですが、GitHubリポジトリ自体は非公開を維持します。

## Cloudflare設定（利用者には一度に一操作ずつ案内する）

以下はCodex用の設定メモです。初心者にまとめて操作を求めないでください。

1. 利用者がCloudflareの無料アカウントを作成または既存アカウントにログイン。
2. Workers & PagesのPagesからGitリポジトリを接続。Cloudflare GitHub Appは対象の非公開リポジトリだけを許可する。
3. 対象：`w67dnyffgg-alt/recall-bloom-study-planner`。production branchは必ず `codex/standalone-pages`。`main` は指定しない。
4. Framework preset：None。root directory：リポジトリのルート。
5. Build command：`bash scripts/build-pages.sh`。
6. Build output directory：`pages-dist`。
7. ビルド環境の非秘密変数：`SKIP_DEPENDENCY_INSTALL=1`。Node 24はリポジトリの `.node-version` で指定します。Bun 1.3.3はビルドスクリプト内の `npm exec` で取得するため、ホスティング側のBun初期バージョンには依存しません。初回ログで使用バージョンを確認する。
8. 不要なプレビューブランチの自動ビルドは無効化し、専用ブランチ以外の変更を自動公開しない。
9. プロジェクト名は固定し、割り当てられたHTTPSの本番URLをMac・iPhoneのSafariで利用。実際のURLは作成成功後に案内する。

このアプリにCloudflare・SupabaseのAPIキーを埋め込む必要はありません。初期のGitHub連携承認は利用者本人にしかできません。将来CLI/APIでCodexから管理する場合も、トークン値をチャットに求めず、利用可能な環境の安全なシークレット設定を使います。

## データ保持

公開版に学習データをアップロードする処理はありません。サイトのコードを更新してもIndexedDBのDB名・スキーマは維持します。ただしMacとiPhoneは別の保存領域であり、JSONをiCloud Driveなど経由で手動復元します。

**保存領域はURLのオリジン単位です。** ローカルMac、Lovableのサイト、Cloudflareの本番URL、プレビューURL間で自動移行はされません。必ず元の環境でJSONを確保してから移してください。既存のLovable公開版にエクスポート画面がない場合、サイトを勝手に更新せず、元データを読み取り専用で取り出す方法を別の手順として相談します。今回は実利用データの移行は行いません。

プレビューごとに変わるURLを日常利用に使わず、固定された本番URLを使ってください。iPhoneのホーム画面への追加は公開後に案内し、Safariとホーム画面の間で記録を確認してから常用してください。ブラウザの保存データ削除やOSによる消去に備え、JSONバックアップを維持します。完全オフライン起動や自動iCloud同期は今回の公開準備に含みません。

## 検証

既存SRSの計算ファイルは変更しません。テスト用Chromiumで、初期状態からのログイン不要起動、科目・教材のインライン追加、登録、再読み込み後の保持、理解度評価、バックアップ、別端末相当の新しいブラウザ領域への復元、クラウドDB通信ゼロを検証します。実機Safariでの最終確認はHTTPS公開後に利用者と行います。

公開準備中に、教材の非同期追加完了が入力途中の単元名を消す競合を検出しました。フォーム状態の更新を関数形式にして入力を保持し、追加中は記録ボタンを無効化しました。遅延した教材追加を再現する回帰テストを追加しています。

## 公式資料

- 料金：https://developers.cloudflare.com/pages/functions/pricing/#static-asset-requests
- 無料枠上限：https://developers.cloudflare.com/pages/platform/limits/
- GitHub連携：https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/
- ビルド環境：https://developers.cloudflare.com/pages/configuration/build-image/
- ZIP直接アップロード（Git連携を利用できない場合の代案）：https://developers.cloudflare.com/pages/get-started/direct-upload/

このクラウド環境ではドキュメントサイトへの通信が拒否されたため、Cloudflare公式GitHubリポジトリ `cloudflare/cloudflare-docs` の対応する原本も確認しています。
