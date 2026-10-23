#!/usr/bin/env python3
"""Compose tall full-page screenshots into readable contact sheets.

Usage:
    python3 tools/shots/compose_sheets.py [shots_dir]

A 2850x19184 page sliced into 4 columns reads far better in a PDF than one
hair-thin image. Columns are separated by a thin gap on a warm background.
Only shots taller than 2x their width are treated as full pages.
Default shots dir: <project root>/.shots   (output: <shots dir>/pdf)
Needs: pip install pillow
"""
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / ".shots"
OUT = SRC / "pdf"

BG = (243, 241, 236)
GAP = 14

if not SRC.is_dir():
    print(f"no screenshots dir at {SRC}")
    sys.exit(0)

os.makedirs(OUT, exist_ok=True)


def sheet(src_png, out_name, target_col_w=430, max_cols=4, q=80):
    im = Image.open(src_png).convert("RGB")
    w, h = im.size
    ncols = max(2, min(max_cols, round(h / w / 1.6) or 2))
    seg_h = h // ncols
    col_w = target_col_w
    scale = col_w / w
    seg_h_s = round(seg_h * scale)
    W = ncols * col_w + (ncols + 1) * GAP
    H = seg_h_s + 2 * GAP
    canvas = Image.new("RGB", (W, H), BG)
    for i in range(ncols):
        top = i * seg_h
        bottom = h if i == ncols - 1 else (i + 1) * seg_h
        seg = im.crop((0, top, w, bottom))
        seg = seg.resize((col_w, round(seg.size[1] * scale)), Image.LANCZOS)
        x = GAP + i * (col_w + GAP)
        canvas.paste(seg, (x, GAP))
        # subtle divider
        ImageDraw.Draw(canvas).line([(x - GAP // 2, GAP), (x - GAP // 2, H - GAP)], fill=(225, 222, 215))
    p = os.path.join(OUT, out_name)
    canvas.save(p, "JPEG", quality=q, optimize=True, progressive=True)
    print(f"{out_name:34s} {canvas.size[0]}x{canvas.size[1]}  {os.path.getsize(p)//1024} KB  cols={ncols}")


shots = sorted(SRC.glob("*.png"))
if not shots:
    print(f"no *.png shots found in {SRC}")
    sys.exit(0)

for p in shots:
    with Image.open(p) as im:
        w, h = im.size
    if h / w < 2:                       # not a full-page shot -> skip
        continue
    narrow = w < 600                    # phone widths -> more, narrower columns
    sheet(
        p,
        f"sheet-{p.stem}.jpg",
        target_col_w=300 if narrow else 430,
        max_cols=5 if narrow else 4,
    )

print("done ->", OUT)
