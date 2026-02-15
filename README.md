# 2月給食献立ビューアー（A献立）

PDFから読み取った献立を、日付ごとのカード形式で見やすく表示するシンプルなWebアプリです。

## 使い方

1. ターミナルでプロジェクトに移動
2. 簡易サーバーを起動

```bash
cd '/Users/mba/Documents/New project'
python3 -m http.server 8000
```

3. ブラウザで以下を開く

- http://localhost:8000

## GitHub Pagesで公開

このプロジェクトは `.github/workflows/deploy-pages.yml` を追加済みなので、
`main` ブランチにpushするとGitHub Pagesへ自動デプロイされます。

### 手順

1. GitHubで空のリポジトリを作成（例: `school-lunch-menu`）
2. ローカルで以下を実行

```bash
cd '/Users/mba/Documents/New project'
git add .
git commit -m "Add lunch menu web app and Pages deploy workflow"
git branch -M main
git remote add origin https://github.com/<your-name>/<repo>.git
git push -u origin main
```

3. GitHub側で `Settings > Pages` を開き、`Source` を `GitHub Actions` にする
4. Actionsの `Deploy static site to GitHub Pages` が成功したら公開URLにアクセス

## ファイル

- `index.html`: 画面
- `styles.css`: スタイル
- `script.js`: 献立データと検索ロジック
- `menu-source.pdf`: 元PDF
