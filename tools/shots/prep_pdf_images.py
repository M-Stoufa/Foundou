#!/usr/bin/env python3
"""Prepare PDF-ready images from raw screenshots.

Usage:
    python3 tools/shots/prep_pdf_images.py [shots_dir]

- Downscale device shots for web/print (long side capped).
- Build tinted device frames (laptop + phone) around viewport shots.
- Save as JPEG (quality 82) for compact embedding.
- Project-agnostic: any *.png in the shots dir is processed automatically.
  Name containing "laptop" -> laptop frame, "phone" -> phone frame, else plain.
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

INK = (17, 19, 17)      # near-black frame
GOLD = (201, 166, 107)

if not SRC.is_dir():
    print(f"no screenshots dir at {SRC}")
    print(f"create it, drop *.png shots inside, then re-run")
    sys.exit(0)

os.makedirs(OUT, exist_ok=True)


def save(im, name, max_side=None, q=82):
    if max_side:
        w, h = im.size
        s = max_side / max(w, h)
        if s < 1:
            im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    p = os.path.join(OUT, name)
    im.convert("RGB").save(p, "JPEG", quality=q, optimize=True, progressive=True)
    print(f"{name:34s} {im.size[0]}x{im.size[1]}  {os.path.getsize(p)//1024} KB")


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius, fill=255)
    return m


def laptop_frame(screenshot, out_name, max_side=1400):
    """Wrap a screen image in a laptop bezel + base."""
    sw, sh = screenshot.size
    s = max_side / sw
    screen = screenshot.resize((round(sw * s), round(sh * s)), Image.LANCZOS)
    sw, sh = screen.size
    bez = 22
    base_h = 26
    W = sw + bez * 2
    H = sh + bez * 2 + base_h
    canvas = Image.new("RGB", (W, H), (240, 238, 233))
    d = ImageDraw.Draw(canvas)
    # lid
    d.rounded_rectangle([0, 0, W - 1, sh + bez * 2 - 1], 16, fill=INK)
    screen = screen.convert("RGB")
    screen.putalpha(rounded_mask(screen.size, 6))
    canvas.paste(screen, (bez, bez), screen)
    # base / hinge
    d.rounded_rectangle([-0, sh + bez * 2, W - 1, H - 1], 8, fill=(28, 30, 28))
    d.rectangle([W * 0.42, sh + bez * 2 - 1, W * 0.58, sh + bez * 2 + 3], fill=(60, 62, 58))
    save(canvas, out_name)


def phone_frame(screenshot, out_name, max_side=560):
    sw, sh = screenshot.size
    s = max_side / sh
    screen = screenshot.resize((round(sw * s), round(sh * s)), Image.LANCZOS)
    sw, sh = screen.size
    bez = 16
    W, H = sw + bez * 2, sh + bez * 2
    canvas = Image.new("RGB", (W, H), (240, 238, 233))
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([0, 0, W - 1, H - 1], 44, fill=INK)
    screen = screen.convert("RGB")
    screen.putalpha(rounded_mask(screen.size, 30))
    canvas.paste(screen, (bez, bez), screen)
    # notch
    d.rounded_rectangle([W * 0.38, bez + 2, W * 0.62, bez + 16], 8, fill=INK)
    save(canvas, out_name)


shots = sorted(SRC.glob("*.png"))
if not shots:
    print(f"no *.png shots found in {SRC}")
    sys.exit(0)

FULL_PAGE_RATIO = 2.2   # taller than this => full-page capture, not a viewport shot

for p in shots:
    name = p.stem
    im = Image.open(p)
    w, h = im.size
    is_full_page = (h / w) > FULL_PAGE_RATIO
    if is_full_page:
        # full-page capture: no device frame, just cap the long side
        cap = 2200 if w >= 900 else 900
        save(im, f"full-{name}.jpg", cap)
    elif "laptop" in name:
        laptop_frame(im, f"frame-{name}.jpg")
    elif "phone" in name:
        phone_frame(im, f"frame-{name}.jpg")
    else:
        save(im, f"vp-{name}.jpg", 1500)

print("done ->", OUT)
