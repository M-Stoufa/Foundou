#!/usr/bin/env python3
"""Capture the admin prototype in its real interactive states.

Usage:
    python3 qa/capture_admin.py [--url URL] [--out DIR]

For each width it records:
  * the sign-in screen
  * the dashboard (viewport + full page)
  * the item editor dialog
  * the publish dialog
  * the delete confirmation
  * a toast after hiding an item

Nothing is stored between runs: each context starts from a fresh page.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

from supabase_qa import mock_owner_api, owner_session

ROOT = Path(__file__).resolve().parent.parent
WIDTHS = [320, 390, 768, 1024, 1440]


def shot(page, out: Path, name: str) -> None:
    # Park the pointer so hover states never leak into a review capture.
    page.mouse.move(1, 1)
    page.wait_for_timeout(120)
    page.screenshot(path=str(out / f"{name}.png"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5502/")
    parser.add_argument("--out", default=str(ROOT / "qa" / "shots"))
    parser.add_argument("--widths", default=",".join(str(w) for w in WIDTHS))
    parser.add_argument("--tag", default="a3")
    args = parser.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    widths = [int(w) for w in args.widths.split(",") if w.strip()]
    tag = args.tag

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width in widths:
            context = browser.new_context(
                viewport={"width": width, "height": 900 if width >= 1024 else 844},
                device_scale_factor=2 if width <= 430 else 1,
                is_mobile=width <= 430,
                has_touch=width <= 430,
                locale="fr-TN",
            )
            if not owner_session(context):
                print("skip: no local Supabase configuration for the guarded dashboard")
                context.close()
                continue
            page = context.new_page()
            mock_owner_api(page)

            # --- sign-in
            page.goto(args.url + "#/admin", wait_until="networkidle")
            page.wait_for_timeout(600)
            shot(page, out, f"{tag}-login-{width}")

            # --- dashboard
            page.goto(args.url + "#/admin/dashboard", wait_until="networkidle")
            page.wait_for_timeout(700)
            shot(page, out, f"{tag}-dash-{width}")
            page.screenshot(path=str(out / f"{tag}-dash-{width}-full.png"), full_page=True)

            # --- item editor
            page.get_by_role("button", name="Modifier Express").first.click()
            page.wait_for_timeout(450)
            shot(page, out, f"{tag}-editor-{width}")
            # show the validation state too: clear the price and submit
            price = page.locator('.modal .field__input[name="item-price"]')
            price.fill("1 200")
            page.locator('.modal button[type="submit"]').click()
            page.wait_for_timeout(350)
            shot(page, out, f"{tag}-editor-error-{width}")
            page.keyboard.press("Escape")
            page.wait_for_timeout(250)

            # --- publish dialog
            page.get_by_role("button", name="Publier").click()
            page.wait_for_timeout(420)
            shot(page, out, f"{tag}-publish-{width}")
            page.keyboard.press("Escape")
            page.wait_for_timeout(250)

            # --- delete confirmation
            page.get_by_role("button", name="Supprimer Express").click()
            page.wait_for_timeout(420)
            shot(page, out, f"{tag}-confirm-{width}")
            page.keyboard.press("Escape")
            page.wait_for_timeout(250)

            # --- toast + hidden-row state
            page.get_by_role("button", name="Masquer Express").click()
            page.wait_for_timeout(450)
            shot(page, out, f"{tag}-toast-{width}")
            page.evaluate("window.scrollTo({ top: 0, behavior: 'instant' })")
            page.wait_for_timeout(200)
            shot(page, out, f"{tag}-hidden-{width}")

            context.close()
        browser.close()

    print(f"admin captures -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
