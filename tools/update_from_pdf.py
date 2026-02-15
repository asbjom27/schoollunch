#!/usr/bin/env python3
import argparse
import json
import re
import subprocess
from pathlib import Path

WEEKDAYS = ["月", "火", "水", "木", "金"]
STAPLE_WORDS = [
    "ごはん",
    "コッペパン",
    "ミルクコッペパン",
    "あじつけコッペパン",
    "こがたコッペパン",
]
NOISE_WORDS = {
    "ぎゅうにゅう",
    "骨に注意して食べましょう。",
    "きざみのりをかけて",
    "たべましょう。",
}


def to_half_width(s: str) -> str:
    table = str.maketrans(
        "０１２３４５６７８９．，",
        "0123456789.,",
    )
    return s.translate(table)


def normalize_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def run_pdftotext(pdf_path: Path, txt_path: Path) -> None:
    subprocess.run([
        "pdftotext",
        "-layout",
        str(pdf_path),
        str(txt_path),
    ], check=True)


def split_day_blocks(lines: list[str]) -> dict[int, list[str]]:
    day_re = re.compile(r"^\s*([0-9０-９]{1,2})(?![0-9０-９\.．])")
    starts: list[tuple[int, int]] = []

    for idx, line in enumerate(lines):
        m = day_re.match(to_half_width(line))
        if not m:
            continue
        day = int(m.group(1))
        starts.append((idx, day))

    blocks: dict[int, list[str]] = {}
    pre_context = 2
    for i, (start_idx, day) in enumerate(starts):
        next_start = starts[i + 1][0] if i + 1 < len(starts) else len(lines)
        begin = max(0, start_idx - pre_context)
        end = next_start if i + 1 >= len(starts) else max(start_idx, next_start - pre_context)
        block_lines = lines[begin:end]
        blocks[day] = [ln.rstrip() for ln in block_lines]

    return blocks


def extract_weekday(block: str) -> str:
    for w in WEEKDAYS:
        if w in block:
            return w
    return ""


def extract_numbers(block: str) -> tuple[float | None, int | None, float | None]:
    normalized = to_half_width(block)
    nums = re.findall(r"[0-9]+(?:\.[0-9]+)?", normalized)
    decimals = [float(n) for n in nums if "." in n]
    integers = [int(n) for n in nums if "." not in n]

    protein = decimals[0] if decimals else None
    salt = decimals[-1] if len(decimals) >= 2 else (decimals[0] if decimals else None)
    kcal = None
    for n in integers:
        if 400 <= n <= 900:
            kcal = n
            break

    return protein, kcal, salt


def extract_staple(block: str) -> str:
    text = normalize_spaces(block)
    for word in sorted(STAPLE_WORDS, key=len, reverse=True):
        if word in text:
            return word
    return ""


def extract_dishes(block: str) -> list[str]:
    lines = [normalize_spaces(l) for l in block.splitlines()]
    candidates: list[str] = []

    for line in lines:
        if not line:
            continue
        if any(x in line for x in ["エネルギー", "たんぱく質", "塩分", "給食センター", "こんだて"]):
            continue
        if line in NOISE_WORDS:
            continue

        line = re.sub(r"^[0-9０-９]+", "", line).strip()
        line = re.sub(r"[0-9０-９]+(?:\.[0-9０-９]+)?", "", line).strip()

        parts = re.findall(r"[ぁ-んァ-ヶー一-龠（）・]{4,}", line)
        for p in parts:
            if p in NOISE_WORDS:
                continue
            if any(noise in p for noise in ["ぎゅうにゅう", "にんじん", "たまねぎ", "キャベツ"]):
                continue
            candidates.append(p)

    dedup: list[str] = []
    for c in candidates:
        if c not in dedup:
            dedup.append(c)

    return dedup[:4]


def build_menu_items(lines: list[str]) -> list[dict]:
    blocks = split_day_blocks(lines)
    items = []

    for day in sorted(blocks.keys()):
        block = "\n".join(blocks[day])
        protein, kcal, salt = extract_numbers(block)
        item = {
            "day": day,
            "weekday": extract_weekday(block),
            "staple": extract_staple(block),
            "dishes": extract_dishes(block),
            "calories": kcal,
            "protein": protein,
            "salt": salt,
        }
        items.append(item)

    return items


def merge_menu_file(out_json: Path, menu_obj: dict) -> None:
    if out_json.exists():
        root = json.loads(out_json.read_text(encoding="utf-8"))
    else:
        root = {"menus": []}

    menus = root.get("menus", [])
    replaced = False
    for i, menu in enumerate(menus):
        if menu.get("id") == menu_obj["id"]:
            menus[i] = menu_obj
            replaced = True
            break

    if not replaced:
        menus.append(menu_obj)

    root["menus"] = sorted(menus, key=lambda x: (x.get("month", ""), x.get("course", "")))
    out_json.write_text(json.dumps(root, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="PDFから給食献立JSONを半自動生成")
    parser.add_argument("--pdf", required=True, help="入力PDFパス")
    parser.add_argument("--month", required=True, help="対象月。例: 2025-02")
    parser.add_argument("--course", required=True, help="献立コース。例: A")
    parser.add_argument("--title", required=True, help="画面タイトル")
    parser.add_argument("--pdf-link", default="menu-source.pdf", help="公開時のPDFリンク")
    parser.add_argument("--out", default="data/menu-data.json", help="出力JSONパス")
    args = parser.parse_args()

    pdf = Path(args.pdf).expanduser().resolve()
    out_json = Path(args.out).resolve()
    txt_path = out_json.parent / "_menu_extract.txt"

    run_pdftotext(pdf, txt_path)
    lines = txt_path.read_text(encoding="utf-8", errors="ignore").splitlines()
    items = build_menu_items(lines)

    menu_id = f"{args.month}-{args.course.lower()}"
    menu_obj = {
        "id": menu_id,
        "month": args.month,
        "monthLabel": f"{args.month[:4]}年{int(args.month[5:]):d}月",
        "course": args.course,
        "title": args.title,
        "pdf": args.pdf_link,
        "items": items,
    }

    merge_menu_file(out_json, menu_obj)
    print(f"Updated: {out_json}")
    print("Note: dishes/staple are semi-automatic. Please review generated entries.")


if __name__ == "__main__":
    main()
