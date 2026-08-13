# CSV Quick Viewer

CSVファイルをドラッグ＆ドロップするだけで、その場でテーブル表示・列ソート・全列検索ができるツールです。すべての処理はブラウザ内で完結し、ファイルはどこにも送信されません。

## 機能

- CSVファイルのドラッグ＆ドロップ / クリック選択
- テーブル表示(列ヘッダに自動判定した型 number / date / text / empty を表示)
- 列ヘッダクリックで昇順→降順→解除のソート
- 全列を対象にしたリアルタイム検索フィルタ
- 空セル数・該当行数のライブ表示

## 技術スタック

- React + Vite
- [PapaParse](https://www.papaparse.com/) (CSVパース)

## セットアップ

```bash
npm install
npm run dev
```

## GitHub Pagesへのデプロイ

```bash
npm run deploy
```

`vite.config.js` の `base` は `/csv-quick-viewer/` を指定しています。リポジトリ名を変える場合はここも合わせて変更してください。

デプロイ後、リポジトリの Settings → Pages → Source を `gh-pages` ブランチに設定すると
`https://<username>.github.io/csv-quick-viewer/` で公開されます。
