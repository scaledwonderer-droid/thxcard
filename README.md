# お礼SSカードジェネレーター（GitHub Pages版）

対話店・接客店向けのお礼SS画像をブラウザ内だけで作成する静的Webアプリです。
ChatGPT・OpenAIアカウント、サーバー、データベース、外部APIは使用しません。

## GitHub Pagesで公開する

1. GitHubで新しいリポジトリを作成します。
2. このフォルダの**中身をすべて**リポジトリ直下へアップロードします。
3. GitHubのリポジトリで Settings → Pages を開きます。
4. Build and deployment の Source を Deploy from a branch にします。
5. main ブランチ、/(root) を選び、Save を押します。
6. 数分後に表示される公開URLを開きます。

リポジトリ名が username.github.io でなくても、相対パスで読み込むためそのまま動作します。

## ファイル構成

- index.html — 画面構造
- style.css — UIとプレビュー画面のデザイン
- app.js — 画像編集・Canvas描画・PNG保存
- templates/templates.js — 6種類のテンプレート定義
- assets/favicon.svg — サイトアイコン
- assets/fonts/ — 使用フォントと各ライセンス
- .nojekyll — GitHub Pages用設定

## プライバシー

読み込んだSSと入力文章はブラウザのメモリ内で処理され、外部へ送信されません。
ページを閉じると編集状態は消えます。PNG作成もCanvas APIによりブラウザ内で完結します。

## 対応ブラウザ

最新版のChrome、Edge、Firefox、Safariを推奨します。

