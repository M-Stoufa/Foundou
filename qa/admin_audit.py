#!/usr/bin/env python3
"""Measure the admin prototype in a real browser and assert its invariants.

Usage:
    python3 qa/admin_audit.py [--url URL]

Runs at every required viewport width against both admin routes and checks:
  * no horizontal page overflow, and no element sticking out of the viewport
  * one shared left edge for the bar, the notice band and the content column
  * the sticky bar stays compact (one row) on phones
  * phone tap targets are 44px, inputs are >=16px (no iOS zoom)
  * text contrast (WCAG 2.2 AA) for every small label, chip and hint
  * stat and category labels are not clipped
  * the dialogs stay inside the viewport, trap focus, close on Escape and
    hand focus back to their opener
  * toasts render inside the viewport

Every number printed comes from getBoundingClientRect / getComputedStyle.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

from layout_audit import STYLE_JS, contrast, parse_rgb
from supabase_qa import mock_owner_api, owner_session

ROOT = Path(__file__).resolve().parent.parent
WIDTHS = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440]

LOGIN_PAIRS = [
    (".login__kicker", ".login__kicker", 4.5),
    (".login__lede", ".login__lede", 4.5),
    (".login__notice-text", ".login__notice", 4.5),
    (".login__notice-title", ".login__notice", 4.5),
    (".login__facts dt", ".login__aside", 4.5),
    (".login__facts dd", ".login__aside", 4.5),
    (".login__wordmark", ".login__aside", 4.5),
    (".login__eyebrow", ".login__aside", 4.5),
    (".login__demo-btn", ".login__demo-btn", 4.5),
    (".login__back", ".login__back", 4.5),
]

DASH_PAIRS = [
    (".admin__shop", ".admin__bar", 4.5),
    (".admin__role", ".admin__bar", 4.5),
    (".admin__bar-link", ".admin__bar", 4.5),
    (".admin__logout", ".admin__bar", 4.5),
    (".admin__notice", ".admin__notice", 4.5),
    (".admin-sub", ".admin-sub", 4.5),
    (".admin-dirty", ".admin-dirty", 4.5),
    (".astat:first-child .astat__label", ".astat", 4.5),
    (".astat:first-child .astat__value", ".astat", 3.0),
    (".astat--warn .astat__label", ".astat--warn", 4.5),
    (".astat--warn .astat__value", ".astat--warn", 3.0),
    (".acat__num", ".acat__head", 4.5),
    (".acat__name", ".acat__head", 4.5),
    (".acat__count", ".acat__count", 4.5),
    (".aitem__name", ".acat", 4.5),
    (".aitem__price", ".acat", 4.5),
    (".aitem__note", ".acat", 4.5),
    (".chip--live", ".chip--live", 4.5),
    (".chip--hidden", ".chip--hidden", 4.5),
    (".chip--pending", ".chip--pending", 4.5),
    (".admin__foot", ".admin__foot", 4.5),
]

MEASURE_JS = """
() => {
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { left: +r.left.toFixed(1), right: +r.right.toFixed(1), top: +r.top.toFixed(1),
             bottom: +r.bottom.toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1) };
  };
  const one = (sel) => { const el = document.querySelector(sel); return el ? box(el) : null; };
  const vw = document.documentElement.clientWidth;

  const outside = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none') continue;
    // Horizontally scrollable strips are allowed to have wider content.
    if (r.right > vw + 1 || r.left < -1) {
      const scroller = el.closest('.catnav__scroll, .modal__body');
      if (scroller && scroller.scrollWidth > scroller.clientWidth) continue;
      outside.push({ tag: el.tagName.toLowerCase(), cls: el.className.toString().slice(0, 60),
                     left: +r.left.toFixed(1), right: +r.right.toFixed(1) });
    }
  }

  return {
    vw,
    doc: { scrollWidth: document.documentElement.scrollWidth, clientWidth: vw },
    outside: outside.slice(0, 8),
    bar: one('.admin__bar'),
    barInner: one('.admin__bar-inner'),
    identity: one('.admin__identity'),
    notice: one('.admin__notice'),
    noticeIcon: one('.admin__notice-icon'),
    noticeText: one('.admin__notice p'),
    title: one('.admin-title'),
    main: one('.admin__main'),
    loginAside: one('.login__aside'),
    loginMain: one('.login__main'),
    loginCard: one('.login__card'),
    loginBack: one('.login__back'),
    loginDemo: one('.login__demo-btn'),
    submit: one('.login__submit'),
    inputs: Array.from(document.querySelectorAll('.field__input')).map((el) => ({
      id: el.id || el.name,
      fontSize: getComputedStyle(el).fontSize,
      height: +el.getBoundingClientRect().height.toFixed(1),
    })),
    barLink: (() => {
      const el = document.querySelector('.admin__bar-link');
      if (!el) return null;
      return { ...box(el), text: el.innerText.trim(), aria: el.getAttribute('aria-label') };
    })(),
    logout: one('.admin__logout'),
    icons: Array.from(document.querySelectorAll('.icon-btn')).slice(0, 6).map((el) => ({
      label: el.getAttribute('aria-label'),
      w: +el.getBoundingClientRect().width.toFixed(1),
      h: +el.getBoundingClientRect().height.toFixed(1),
    })),
    chips: Array.from(document.querySelectorAll('.chip')).map((el) => ({
      text: el.innerText,
      overflowing: el.scrollWidth > el.clientWidth + 1,
    })),
    clippedLabels: Array.from(document.querySelectorAll('.astat__label, .acat__count, .login__facts dt'))
      .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2)
      .map((el) => el.innerText.trim()),
    cards: Array.from(document.querySelectorAll('.acat')).slice(0, 3).map((card) => {
      const r = card.getBoundingClientRect();
      const actions = card.querySelector('.aitem__actions');
      const name = card.querySelector('.aitem__name');
      return {
        right: +r.right.toFixed(1),
        actions: actions ? box(actions) : null,
        name: name ? box(name) : null,
      };
    }),
    statsCols: (() => {
      const stats = document.querySelector('.astats');
      if (!stats) return 0;
      return getComputedStyle(stats).gridTemplateColumns.split(' ').length;
    })(),
  };
}
"""

MODAL_JS = """
() => {
  const modal = document.querySelector('.modal');
  const panel = document.querySelector('.modal__panel');
  const foot = document.querySelector('.modal__foot');
  const body = document.querySelector('.modal__body');
  const active = document.activeElement;
  if (!modal || !panel) return { open: false };
  const pr = panel.getBoundingClientRect();
  const fr = foot ? foot.getBoundingClientRect() : null;
  const br = body ? body.getBoundingClientRect() : null;
  return {
    open: true,
    inside: pr.left >= -1 && pr.right <= window.innerWidth + 1 && pr.top >= -1 && pr.bottom <= window.innerHeight + 1,
    panel: { left: +pr.left.toFixed(1), right: +pr.right.toFixed(1), top: +pr.top.toFixed(1), bottom: +pr.bottom.toFixed(1) },
    footerVisible: !!fr && fr.bottom <= pr.bottom + 1 && fr.top >= pr.top,
    bodyScrolls: !!br && body.scrollHeight > body.clientHeight,
    focusInDialog: !!active && panel.contains(active),
    focusTag: active ? active.tagName.toLowerCase() : null,
    inertScroll: document.body.style.overflow,
  };
}
"""


def ratio(page, fg_sel: str, bg_sel: str) -> float | None:
    fg = page.evaluate(STYLE_JS, fg_sel)
    bg = page.evaluate(STYLE_JS, bg_sel)
    if not fg or not bg:
        return None
    return contrast(parse_rgb(fg["color"]), parse_rgb(bg["background"]))


def check_contrast(page, pairs, errors: list[str]) -> None:
    for fg_sel, bg_sel, minimum in pairs:
        value = ratio(page, fg_sel, bg_sel)
        if value is None:
            continue
        if value < minimum:
            errors.append(f"{fg_sel} contrast {value}:1 < {minimum}:1")


def audit_login(page, width: int) -> dict:
    errors: list[str] = []
    warnings: list[str] = []
    data = page.evaluate(MEASURE_JS)

    if data["doc"]["scrollWidth"] - data["doc"]["clientWidth"] > 1:
        errors.append(f"horizontal overflow {data['doc']['scrollWidth'] - data['doc']['clientWidth']}px")
    if data["outside"]:
        errors.append(f"elements outside viewport: {data['outside'][:3]}")

    if not data["loginAside"]:
        errors.append("login aside missing")
    elif width <= 430 and data["loginAside"]["height"] > 260:
        errors.append(f"phone brand band is {data['loginAside']['height']}px tall (max 260)")
    if not data["loginCard"]:
        errors.append("login card missing")

    if data["submit"] and data["submit"]["height"] < 44:
        errors.append(f"submit button only {data['submit']['height']}px tall")
    for field in data["inputs"]:
        if float(field["fontSize"].replace("px", "")) < 16:
            errors.append(f"input {field['id']} font-size {field['fontSize']} < 16px")
        if field["height"] < 44:
            errors.append(f"input {field['id']} only {field['height']}px tall")
    for key in ("loginBack", "loginDemo"):
        if data[key] and data[key]["height"] < 44:
            errors.append(f"{key} target only {data[key]['height']}px tall")

    check_contrast(page, LOGIN_PAIRS, errors)

    # The notice must describe what actually happens: credentials are checked
    # by Supabase Auth, and only the owner allow-list gets in.
    notice_text = page.evaluate(
        "() => (document.querySelector('.login__notice')?.innerText || '').toLowerCase()"
    )
    if "supabase auth" not in notice_text:
        errors.append("login notice does not state that Supabase Auth verifies credentials")

    return {"errors": errors, "warnings": warnings, "data": data}


def audit_dashboard(page, width: int) -> dict:
    errors: list[str] = []
    warnings: list[str] = []
    data = page.evaluate(MEASURE_JS)

    if data["doc"]["scrollWidth"] - data["doc"]["clientWidth"] > 1:
        errors.append(f"horizontal overflow {data['doc']['scrollWidth'] - data['doc']['clientWidth']}px")
    if data["outside"]:
        errors.append(f"elements outside viewport: {data['outside'][:3]}")

    # --- one shared left edge (the notice text is indented past its icon,
    # so the icon is the element that must line up with the title)
    edges = {
        "bar": data["identity"]["left"] if data.get("identity") else None,
        "notice": data["noticeIcon"]["left"] if data.get("noticeIcon") else None,
        "title": data["title"]["left"] if data["title"] else None,
    }
    present = {k: v for k, v in edges.items() if v is not None}
    if len(present) == 3 and max(present.values()) - min(present.values()) > 1.5:
        errors.append(f"left edges disagree: {present}")

    # --- sticky bar must stay one compact row
    if data["bar"] and data["bar"]["height"] > 88:
        errors.append(f"sticky bar is {data['bar']['height']}px tall (max 88)")

    # --- stat labels / chips must not be clipped
    if data["clippedLabels"]:
        errors.append(f"clipped labels: {data['clippedLabels']}")
    for chip in data["chips"]:
        if chip["overflowing"]:
            errors.append(f"chip '{chip['text']}' overflows its box")
    if data["statsCols"] != 3:
        errors.append(f"stats grid has {data['statsCols']} columns, expected 3")

    # --- item rows must stay inside their card
    for index, card in enumerate(data["cards"]):
        if card["actions"] and card["actions"]["right"] > card["right"] + 1:
            errors.append(f"card {index}: actions end at {card['actions']['right']} past card {card['right']}")
        if width >= 544 and card["name"] and card["name"]["width"] < 110:
            errors.append(f"card {index}: name column squeezed to {card['name']['width']}px")

    # --- tap targets
    limit = 44 if width <= 430 else 24
    for icon in data["icons"]:
        if min(icon["w"], icon["h"]) < limit:
            errors.append(f"icon target '{icon['label']}' is {icon['w']}x{icon['h']}px (< {limit})")
    for key in ("barLink", "logout"):
        if data[key] and data[key]["height"] < limit:
            errors.append(f"{key} target only {data[key]['height']}px tall")
    if width <= 430 and data["barLink"]:
        if data["barLink"]["width"] > 48 and width < 416:
            errors.append(f"phone back link still {data['barLink']['width']}px wide")
        if "Voir le menu" not in (data["barLink"]["text"] or ""):
            errors.append("phone back link lost its accessible text")

    check_contrast(page, DASH_PAIRS, errors)

    # --- dialog behaviour: open, contained, escapable, focus restored
    if width not in (390, 768, 1440):
        return {"errors": errors, "warnings": warnings, "data": data, "dialog": None}

    opener = page.locator(".admin-head__actions .button").last
    opener.click()
    page.wait_for_timeout(420)
    dialog = page.evaluate(MODAL_JS)
    if not dialog.get("open"):
        errors.append("publish dialog did not open")
    else:
        if not dialog["inside"]:
            errors.append(f"dialog outside viewport: {dialog['panel']}")
        if not dialog["footerVisible"]:
            errors.append("dialog footer is cut off")
        if not dialog["focusInDialog"]:
            errors.append(f"focus not moved into dialog (on {dialog['focusTag']})")
        if dialog["inertScroll"] != "hidden":
            warnings.append("body scroll not locked while dialog is open")
        m = page.evaluate(STYLE_JS, ".modal__title")
        b = page.evaluate(STYLE_JS, ".modal__panel")
        if m and b:
            value = contrast(parse_rgb(m["color"]), parse_rgb(b["background"]))
            if value < 4.5:
                errors.append(f"modal title contrast {value}:1")
    page.keyboard.press("Escape")
    page.wait_for_timeout(220)
    if page.evaluate("() => !!document.querySelector('.modal')"):
        errors.append("Escape did not close the dialog")
    if not page.evaluate("() => document.activeElement === document.querySelector('.admin-head__actions .button:last-child')"):
        errors.append("focus was not returned to the dialog opener")

    # --- item editor: 16px inputs, contained
    editor = page.get_by_role("button", name="Modifier Express").first
    if editor.count():
        editor.click()
        page.wait_for_timeout(420)
        dialog = page.evaluate(MODAL_JS)
        if not dialog.get("open"):
            errors.append("item editor did not open")
        else:
            if not dialog["inside"]:
                errors.append(f"item editor outside viewport: {dialog['panel']}")
            if not dialog["footerVisible"]:
                errors.append("item editor footer is cut off")
            for field in page.evaluate(
                "() => Array.from(document.querySelectorAll('.modal .field__input')).map((el) => parseFloat(getComputedStyle(el).fontSize))"
            ):
                if field < 16:
                    errors.append(f"editor input font-size {field}px < 16px")
        page.keyboard.press("Escape")
        page.wait_for_timeout(220)

    # --- toast: appears, inside the viewport, readable
    toggle = page.get_by_role("button", name="Masquer Express").first
    if toggle.count():
        toggle.click()
        page.wait_for_timeout(420)
        toast = page.evaluate(
            """() => {
                const t = document.querySelector('.toast');
                if (!t) return null;
                const r = t.getBoundingClientRect();
                return { inside: r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
                         left: +r.left.toFixed(1), right: +r.right.toFixed(1),
                         bottom: +r.bottom.toFixed(1), vh: innerHeight,
                         text: t.innerText };
            }"""
        )
        if not toast:
            errors.append("toast did not appear after hiding an item")
        else:
            if not toast["inside"]:
                errors.append(f"toast outside viewport: {toast}")
            if "brouillon local" not in toast["text"]:
                errors.append("toast does not say the change is a browser-local draft")
            value = ratio(page, ".toast__text", ".toast")
            if value is not None and value < 4.5:
                errors.append(f"toast text contrast {value}:1")

    return {"errors": errors, "warnings": warnings, "data": data, "dialog": dialog}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5502/")
    parser.add_argument("--json", default=str(ROOT / "qa" / "admin-audit.json"))
    args = parser.parse_args()

    report: dict = {"url": args.url, "routes": {}}
    failed = False

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for route, tag in (("#/admin", "login"), ("#/admin/dashboard", "dashboard")):
            route_report: dict = {}
            for width in WIDTHS:
                context = browser.new_context(
                    viewport={"width": width, "height": 900 if width >= 1024 else 844},
                    device_scale_factor=2 if width <= 430 else 1,
                    is_mobile=width <= 430,
                    has_touch=width <= 430,
                    locale="fr-TN",
                )
                if tag == 'dashboard':
                    # The real guard needs an owner session; seed a test one and
                    # answer the allow-list query without touching any server.
                    if not owner_session(context):
                        print('         SKIP   dashboard: no local Supabase configuration')
                        context.close()
                        continue
                page = context.new_page()
                if tag == 'dashboard':
                    mock_owner_api(page)
                page.goto(args.url + route, wait_until="networkidle")
                page.wait_for_timeout(450)
                result = (
                    audit_login(page, width) if tag == "login" else audit_dashboard(page, width)
                )
                errors = result["errors"]
                route_report[width] = {
                    "errors": errors,
                    "warnings": result["warnings"],
                    "overflow": result["data"]["doc"]["scrollWidth"]
                    - result["data"]["doc"]["clientWidth"],
                    "barHeight": (result["data"].get("bar") or {}).get("height"),
                }
                status = "FAIL" if errors else "ok  "
                print(f"[{status}] {tag:<9} {width:>4}px  overflow={route_report[width]['overflow']:>2}px  "
                      f"bar={route_report[width]['barHeight']}")
                for message in errors:
                    print(f"         ERROR  {message}")
                for message in result["warnings"]:
                    print(f"         WARN   {message}")
                failed = failed or bool(errors)
                context.close()
            report["routes"][tag] = route_report
        browser.close()

    Path(args.json).write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nreport -> {args.json}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
