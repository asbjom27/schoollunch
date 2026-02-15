# 給食献立ビューアー

PDFから読み取った献立を、日付ごとのカード形式で見やすく表示するWebアプリです。

## ローカル起動

```bash
cd '/Users/mba/Documents/New project'
python3 -m http.server 8000
```

ブラウザ:
- http://127.0.0.1:8000

## 追加した機能

- 月タブ切り替え（`data/menu-data.json` 内の複数月を自動表示）
- 検索/曜日フィルタ
- スマホ最適化（1カラム表示、44pxタップ領域、横スクロール月タブ）
- PDF更新の半自動化スクリプト

## PDF更新の手順（半自動）

1. 新しいPDFを配置
2. 変換スクリプトを実行

```bash
cd '/Users/mba/Documents/New project'
python3 tools/update_from_pdf.py \
  --pdf '/path/to/new-menu.pdf' \
  --month 2025-03 \
  --course A \
  --title '3月 給食献立ビューアー（A献立）' \
  --pdf-link 'menu-source-2025-03-a.pdf' \
  --out data/menu-data.json
```

3. 生成された `data/menu-data.json` の `dishes`/`staple` を目視で微調整

注記:
- 栄養値・日付は高精度で拾います。
- 料理名と主食はPDFのレイアウト依存が大きいので、最終確認が必要です。

## GitHub Pages公開

`main` ブランチにpushで自動デプロイされます（`.github/workflows/deploy-pages.yml`）。

公開URL:
- https://asbjom27.github.io/schoollunch/

## 主要ファイル

- `index.html`: UI
- `styles.css`: スタイル
- `script.js`: 描画とフィルタ
- `data/menu-data.json`: 献立データ
- `tools/update_from_pdf.py`: PDF変換スクリプト
