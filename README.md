# Recall Bloom Study Planner

忘却曲線と間隔反復学習を活用した、

個人用の復習管理アプリを作成してください。

【目的】

資格試験の勉強で、学習した単元を記録し、

適切なタイミングで復習できるようにする。

【必要な機能】

1. 学習記録

・科目名

・教材名

・単元名

・ページ数

・学習日時

・メモ

2. 復習スケジュール

登録した学習日時を基準に、

以下の復習間隔を設定する。

1時間後 → 1日後 → 3日後

→ 7日後 → 14日後 → 30日後

各復習を完了すると、

次の復習予定を自動計算する。

3. 復習結果の記録

・覚えていた

・あやふや

・忘れていた

評価に応じて次回の復習間隔を調整する。

忘れていた場合は短い間隔に戻す。

4. ホーム画面

・今日の復習

・期限を過ぎた復習

・今後の復習予定

・学習済み単元数

・復習完了率

5. カレンダー

復習予定と実施履歴を表示する。

6. データ管理

ログイン機能とクラウド保存を実装する。

異なる端末でも同じ学習記録を利用できるようにする。

他のユーザーがデータを閲覧できないようにする。

【デザイン】

Apple製品に合う洗練されたUI。

クールトーンのライトグレーを基調とし、

淡いピンクをアクセントに使用する。

透明感のある、ちゅるんとした質感。

余白を広く取り、上品でかわいい印象。

iPhone、iPad、Macの画面に対応させる。

まずは主要機能を実装してください。

通知機能は後から追加できる設計にしてください。

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://recall-bloom-study-planner.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f2cf0e9b-2c28-57c7-8a2e-de82fe50ad99).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
