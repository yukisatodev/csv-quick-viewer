# CSV Quick Viewer

CSVファイルをドラッグ＆ドロップするだけで、その場でテーブル表示・列ソート・検索・グラフ化ができるツールです。すべての処理はブラウザ内で完結し、ファイルはどこにも送信されません。

## 目的・経緯

「とりあえず中身を見たいだけなのに、Excelを立ち上げるのは大げさ」という場面のための軽量ビューワーです。フリーランスでWebエンジニアを目指す中でのポートフォリオの一つとして、また次に予定しているCSVデータチェックツール(Pythonバックエンド版)の前段階として、まずはフロントエンドのみで完結する形で作成しました。

## 機能

- CSVファイルのドラッグ＆ドロップ / クリック選択 / サンプルデータ / 公開URLからの読み込み
- テーブル表示(列ヘッダに自動判定した型 number / date / text / empty を表示)
- 列ヘッダクリックで昇順→降順→解除のソート
- 全列を対象にしたリアルタイム検索フィルタ
- 列の表示/非表示切り替え
- 列ごとの統計サマリー(数値: min/max/avg、文字列: ユニーク数、いずれも欠損数)
- 数値列の簡易棒グラフ表示(先頭50行)
- 絞り込み・並べ替え後の結果をCSVでダウンロード
- ダークモード切り替え

## 技術スタック

- React + Vite
- [PapaParse](https://www.papaparse.com/)(CSVパース/エクスポート)
- [Recharts](https://recharts.org/)(グラフ表示)
- Vitest(ユニットテスト)
- GitHub Actions(push時に自動でテスト・ビルドを実行するCI)

## セットアップ

```bash
npm install
npm run dev
```

## テスト

```bash
npm run test
```

## GitHub Pagesへのデプロイ

```bash
npm run deploy
```

`vite.config.js` の `base` は `/csv-quick-viewer/` を指定しています。リポジトリ名を変える場合はここも合わせて変更してください。

デプロイ後、リポジトリの Settings → Pages → Source を `gh-pages` ブランチに設定すると
`https://<username>.github.io/csv-quick-viewer/` で公開されます。
