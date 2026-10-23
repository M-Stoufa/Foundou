#!/usr/bin/env python3
"""Capture QA screenshots of the running site and report browser problems.

Usage:
    python3 qa/capture.py [--url URL] [--out DIR] [--tag NAME] [--viewports 390,1440]

The script captures one viewport-sized screenshot per requested width, plus a
full-page capture for the widest and narrowest widths. Console errors, page
errors and failed network requests are collected and written to
<out>/report-<tag>.json.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_VIEWPORTS = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440]

MOBILE = [320, 360, 375, 390, 430]
TABLET = [768]
DESKTOP = [1024, 1280, 1440]


def device_kind(width: int) -> str:
    if width <= 430:
        return "phone"
    if width < 1024:
        return "tablet"
    return "laptop"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5502/")
    parser.add_argument("--out", default=str(ROOT / "qa" / "shots"))
    parser.add_argument("--tag", default="menu")
    parser.add_argument("--hash", default="", help="hash route to open, e.g. #/admin")
    parser.add_argument(
        "--viewports",
        default="",
        help="comma separated widths; default = all required widths",
    )
    parser.add_argument("--full-page", default="", help="comma separated widths to capture full-page")
    parser.add_argument("--reduced-motion", action="store_true")
    parser.add_argument("--dark", action="store_true", help="emulate prefers-color-scheme: dark")
    args = parser.parse_args()

    widths = (
        [int(w) for w in args.viewports.split(",") if w.strip()]
        if args.viewports
        else DEFAULT_VIEWPORTS
    )
    full_page_widths = (
        [int(w) for w in args.full_page.split(",") if w.strip()]
        if args.full_page
        else [min(widths), max(widths)]
    )

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    url = args.url + (args.hash or "")
    report = {
        "url": url,
        "captures": [],
        "console_errors": [],
        "page_errors": [],
        "failed_requests": [],
    }

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width in widths:
            context = browser.new_context(
                viewport={"width": width, "height": 900 if width >= 1024 else 844},
                device_scale_factor=2 if width <= 430 else 1,
                is_mobile=width <= 430,
                has_touch=width <= 430,
                reduced_motion="reduce" if args.reduced_motion else "no-preference",
                color_scheme="dark" if args.dark else "light",
                locale="fr-TN",
            )
            page = context.new_page()
            page.on(
                "console",
                lambda msg, w=width: report["console_errors"].append(
                    {"width": w, "type": msg.type, "text": msg.text}
                )
                if msg.type in ("error", "warning")
                else None,
            )
            page.on(
                "pageerror",
                lambda err, w=width: report["page_errors"].append({"width": w, "text": str(err)}),
            )
            page.on(
                "requestfailed",
                lambda req, w=width: report["failed_requests"].append(
                    {"width": w, "url": req.url, "failure": str(req.failure)}
                ),
            )

            page.goto(url, wait_until="networkidle")
            page.wait_for_timeout(700)

            kind = device_kind(width)
            name = f"{args.tag}-{kind}-{width}"
            page.screenshot(path=str(out / f"{name}.png"))
            report["captures"].append({"name": name, "width": width, "kind": kind})

            if width in full_page_widths:
                # The menu reveals on scroll, so a full-page capture taken at
                # scroll position 0 would record the lower sections as blank
                # paper. Walk the page with *instant* scrolls (the stylesheet
                # sets scroll-behavior: smooth, which would swallow the walk),
                # then wait until every section really is revealed.
                page.evaluate(
                    """async () => {
                        const root = document.documentElement;
                        const previous = root.style.scrollBehavior;
                        root.style.scrollBehavior = 'auto';
                        const step = Math.max(200, Math.floor(window.innerHeight * 0.6));
                        const height = root.scrollHeight;
                        for (let y = 0; y <= height; y += step) {
                            window.scrollTo({ top: y, behavior: 'instant' });
                            await new Promise((r) => setTimeout(r, 120));
                        }
                        window.scrollTo({ top: 0, behavior: 'instant' });
                        root.style.scrollBehavior = previous;
                        await new Promise((r) => setTimeout(r, 250));
                    }"""
                )
                try:
                    page.wait_for_function(
                        """() => Array.from(document.querySelectorAll('[data-reveal]'))
                            .every((el) => el.classList.contains('is-in'))""",
                        timeout=5000,
                    )
                except Exception as exc:  # noqa: BLE001 - report, never abort the run
                    print(f"  WARNING: reveal incomplete at {width}px: {exc}")
                page.wait_for_timeout(700)  # let the last transition finish
                page.screenshot(path=str(out / f"{name}-full.png"), full_page=True)
                report["captures"].append(
                    {"name": f"{name}-full", "width": width, "kind": f"{kind}-full"}
                )

            context.close()
        browser.close()

    report_path = out / f"report-{args.tag}.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"captures: {len(report['captures'])} -> {out}")
    print(f"console errors/warnings: {len(report['console_errors'])}")
    for entry in report["console_errors"][:10]:
        print("   ", entry)
    print(f"page errors: {len(report['page_errors'])}")
    for entry in report["page_errors"][:10]:
        print("   ", entry)
    print(f"failed requests: {len(report['failed_requests'])}")
    for entry in report["failed_requests"][:10]:
        print("   ", entry)
    print(f"report -> {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
