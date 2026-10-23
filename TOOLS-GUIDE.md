# Tools guide — Foundou (free only)

Copied from the LUMA toolchain on 2026-10-22, generalised so it works in any
new project folder. Windows + WSL (Ubuntu 26.04).

---

## 1. What is installed (no need to reinstall)

| Tool | Where | Use for |
|---|---|---|
| VS Code 1.139 (+ Prettier, Live Server, Tailwind IntelliSense, Gutter Preview) | Windows | Edit HTML/CSS/JS; right-click `index.html` → Open with Live Server (port **5502** here) |
| Brave browser 155 (+ DevTools, Lighthouse) | Windows | `F12` device mode for phone/laptop shots, live CSS editing, headless CLI screenshots |
| Figma Desktop (free tier) | Windows | Mock layouts before coding; free kits in Figma Community |
| GIMP 3.2.4 | Windows | Retouch/crop single photos, export WebP (the "edit everything" app) |
| XnConvert 1.116 | Windows | Batch resize/convert/compress (folder → WebP q70, max 1600px) |
| Photopea (web, free) | browser | Quick Photoshop-like edits without install |
| Node 24 + Prettier 3.9 (WSL) | WSL | `prettier --check assets/*.js` formatting |
| tesseract (WSL) | WSL | OCR — reads text out of menu screenshots |
| ffmpeg / yt-dlp (WSL) | WSL | Video + media handling |
| sharp-cli 6.1 (WSL) | `~/.npm-global/bin/sharp` | One-off converts: `sharp -i in.jpg -o out.webp --webpQuality 68 resize 1600` |

Preview without install: `python3 -m http.server 8000` in the site folder → http://localhost:8000

---

## 2. Repo-local tools (copied here, ready to run)

All paths relative to the **project root** (the folder with `index.html`).

| File | Command | What it does |
|---|---|---|
| `tools/make_thumbs.py` | `python3 tools/make_thumbs.py` · `--regen` (rebuild all, 800px/q68) · `--avif` (also write AVIF) | Makes `images/t/<same>.webp` thumbs for every photo in `images/` |
| `tools/audit_images.py` | `python3 tools/audit_images.py` | Flags >300KB files, missing thumbs, missing `alt`/`width`/`height`/`loading` |
| `tools/shots/prep_pdf_images.py` | `python3 tools/shots/prep_pdf_images.py` | Edits raw screenshots: downscales, adds laptop/phone device frames, saves JPEG → `.shots/pdf/` |
| `tools/shots/compose_sheets.py` | `python3 tools/shots/compose_sheets.py` | Slices tall full-page screenshots into multi-column contact sheets → `.shots/pdf/` |
| `.stylelintrc.json` | `npx stylelint assets/*.css` | CSS validator (duplicate properties/selectors) |

Needs `pip install pillow` (Pillow 12 already installed in WSL).

Screenshot scripts read `<project>/.shots/` and write `<project>/.shots/pdf/`.
Pass a different folder as argument: `python3 tools/shots/prep_pdf_images.py /path/to/shots`.
Naming convention used by the framer: `*laptop*` → laptop frame, `*phone*` → phone frame.

---

## 3. Screenshot workflow (how the LUMA shots were made)

1. Serve the site locally (Live Server on 5502, or `python3 -m http.server 8000`).
2. Capture with Brave headless from Windows:
   `brave.exe --headless --disable-gpu --window-size=1440,900 --screenshot="C:\path\shot.png" http://localhost:5502/`
   - 1440 wide = laptop, 390 wide = phone. Add `--hide-scrollbars` for clean shots.
3. Full-page captures + interaction states (drawer open, lightbox open, filtered menu):
   use `puppeteer-core` over CDP with the Windows-side Node, then `page.screenshot({fullPage:true})`.
4. Edit the results with `tools/shots/prep_pdf_images.py` (frames, downscale) and
   `tools/shots/compose_sheets.py` (contact sheets) → ready for the PDF handoff.

---

## 4. Image rules (enforced by the scripts)

- Full photo = **WebP**, max **1600px** long side, **≤300KB**.
- Thumb = `images/t/<same>.webp`, **800px, q68**. Never thumb `favicon`, `hero-poster`, `parallax-*`, `logo`.
- Every `<img>` needs `alt`, `width`+`height`, `loading="lazy"` (except hero).
- Hero/LCP image: eager + `fetchpriority="high"`; never lazy-load it. Offscreen carousel clones get `fetchpriority="low"`.
- Strip EXIF. One photo → one placement (avoid duplicates).

**Add a photo:** 1) drop the `.webp` in `images/` 2) `python3 tools/make_thumbs.py`
3) reference it in the page/gallery data 4) `python3 tools/audit_images.py` → must print `OK`.

---

## 5. Validators

| Check | Command |
|---|---|
| HTML | `npx htmlhint *.html` |
| CSS | `npx stylelint assets/*.css` |
| Links | `npx broken-link-checker http://localhost:5502 -r` |
| Formatting | `npx prettier --check assets/*.js` |
| Images | `python3 tools/audit_images.py` |

Note: Playwright cannot drive Windows Brave from WSL (pipe boundary) —
headless CLI + puppeteer-core over CDP cover the same checks.

---

## 6. Image-heavy design rules that worked

Mobile-first (62%+ of visits are phones); 44px tap targets; 16px min body text;
single-column on mobile; whitespace frames CTAs; menu as real HTML text (never
a PDF — SEO + screen readers); hours + phone + address on every page; no
autoplay-with-sound; no heavy scripts. One idea per screen; cut section
padding until each block reads whole (~1 viewport); headlines shrink with
content (`clamp`); every photo earns its slot (hero / appetite / place /
people / proof), else cut it.
