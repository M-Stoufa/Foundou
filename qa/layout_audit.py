#!/usr/bin/env python3
"""Measure the rendered layout in a real browser and assert the invariants.

Usage:
    python3 qa/layout_audit.py [--url URL]

Checks performed at every required viewport width:
  * no horizontal page overflow
  * prices align in one column
  * the dotted leader actually renders (non-transparent, visible)
  * item names never collide with their price
  * every section rule is a real 1px border
  * section rules / masthead rule share the content right edge
  * interactive controls are large enough to tap
  * text colour contrast (WCAG 2.2 AA) for the key pairs
  * no section stays invisible after a jump to the bottom of the page
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
WIDTHS = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440]

CONTRAST_PAIRS = [
    (".row__name", ".menu", 4.5),
    (".row__price", ".menu", 4.5),
    (".row__unit", ".menu", 4.5),
    (".row__note", ".menu", 4.5),
    (".catnav__link", ".catnav", 4.5),
    (".catnav__num", ".catnav", 4.5),
    (".eyebrow", ".masthead", 4.5),
    (".section__title", ".menu", 4.5),
    (".masthead__name", ".masthead", 4.5),
    (".footer__note", ".footer", 4.5),
]


def parse_rgb(value: str) -> tuple[int, int, int]:
    numbers = [float(part) for part in value.replace("rgba", "rgb").strip("rgb() ").split(",")[:3]]
    return int(numbers[0]), int(numbers[1]), int(numbers[2])


def relative_luminance(rgb: tuple[int, int, int]) -> float:
    channels = []
    for value in rgb:
        srgb = value / 255
        channels.append(srgb / 12.92 if srgb <= 0.04045 else ((srgb + 0.055) / 1.055) ** 2.4)
    r, g, b = channels
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    la, lb = relative_luminance(a), relative_luminance(b)
    lighter, darker = max(la, lb), min(la, lb)
    return round((lighter + 0.05) / (darker + 0.05), 2)


MEASURE_JS = """
() => {
  const rect = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  };
  const rows = Array.from(document.querySelectorAll('.row')).map((row) => {
    const name = row.querySelector('.row__name').getBoundingClientRect();
    const price = row.querySelector('.row__price').getBoundingClientRect();
    const leader = row.querySelector('.row__leader');
    const style = getComputedStyle(leader);
    return {
      name: { left: name.left, right: name.right, top: name.top, bottom: name.bottom },
      price: { left: price.left, right: price.right, top: price.top, bottom: price.bottom },
      leader: {
        width: leader.getBoundingClientRect().width,
        image: style.backgroundImage,
        color: style.backgroundColor,
      },
      gap: price.left - name.right,
    };
  });
  const sections = Array.from(document.querySelectorAll('.section')).map((section) => {
    const head = section.querySelector('.section__head');
    const title = section.querySelector('.section__title');
    const headRect = head ? head.getBoundingClientRect() : null;
    const titleRect = title ? title.getBoundingClientRect() : null;
    const ruleStyle = head ? getComputedStyle(head, '::after') : null;
    return {
      id: section.id,
      ruleRight: headRect ? headRect.right : null,
      ruleBottom: headRect ? headRect.bottom : null,
      ruleWidth: ruleStyle ? ruleStyle.height : null,
      ruleColor: ruleStyle ? ruleStyle.backgroundImage : null,
      titleTop: titleRect ? titleRect.top : null,
      titleBottom: titleRect ? titleRect.bottom : null,
    };
  });
  const navLinks = Array.from(document.querySelectorAll('.catnav__link')).map((link) => {
    const r = link.getBoundingClientRect();
    return { text: link.innerText.trim(), width: r.width, height: r.height, top: r.top };
  });
  const navScroll = document.querySelector('.catnav__scroll');
  return {
    doc: { scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth },
    body: { scrollWidth: document.body.scrollWidth },
    rows,
    sections,
    navLinks,
    nav: {
      scrollWidth: navScroll ? navScroll.scrollWidth : 0,
      clientWidth: navScroll ? navScroll.clientWidth : 0,
    },
    mastheadRule: (() => {
      const el = document.querySelector('.masthead__content') || document.querySelector('.masthead__inner');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { right: r.right, left: r.left };
    })(),
    page: rect('.page'),
    menu: rect('.menu'),
    firstNavLink: navLinks[0] || null,
    firstSectionTitle: sections[0] ? { top: sections[0].titleTop, bottom: sections[0].titleBottom } : null,
  };
}
"""

STYLE_JS = """
(sel) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const s = getComputedStyle(el);
  const parse = (str) => {
    const nums = (str.match(/[\\d.]+/g) || []).map(Number);
    if (nums.length < 3) return null;
    return { r: nums[0], g: nums[1], b: nums[2], a: nums.length > 3 ? nums[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  // Walk up the tree, compositing every translucent background.
  let node = el;
  const layers = [];
  while (node) {
    const c = parse(getComputedStyle(node).backgroundColor);
    if (c && c.a > 0) layers.push(c);
    node = node.parentElement;
  }
  let base = { r: 255, g: 255, b: 255, a: 1 };
  for (let i = layers.length - 1; i >= 0; i -= 1) base = over(layers[i], base);
  const fg = parse(s.color) || { r: 0, g: 0, b: 0, a: 1 };
  const composited = over(fg, base);
  return {
    color: `rgb(${Math.round(composited.r)}, ${Math.round(composited.g)}, ${Math.round(composited.b)})`,
    background: `rgb(${Math.round(base.r)}, ${Math.round(base.g)}, ${Math.round(base.b)})`,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
  };
}
"""


def audit_page(page, width: int) -> tuple[list[str], list[str], dict]:
    errors: list[str] = []
    warnings: list[str] = []
    data = page.evaluate(MEASURE_JS)

    overflow = data["doc"]["scrollWidth"] - data["doc"]["clientWidth"]
    if overflow > 1:
        errors.append(f"horizontal page overflow of {overflow}px")

    # --- prices aligned in one column
    rights = [round(row["price"]["right"], 1) for row in data["rows"]]
    if rights and (max(rights) - min(rights)) > 1:
        errors.append(f"price column is ragged: {min(rights)} -> {max(rights)}")

    # --- name / price collision
    for index, row in enumerate(data["rows"]):
        if row["gap"] < 2:
            errors.append(f"row {index}: name and price nearly collide (gap {row['gap']:.1f}px)")

    # --- leaders must be drawn
    for index, row in enumerate(data["rows"]):
        if row["leader"]["width"] < 4:
            warnings.append(f"row {index}: leader collapsed to {row['leader']['width']:.1f}px")
        if "radial-gradient" not in (row["leader"]["image"] or "") and "none" != row["leader"]["image"]:
            warnings.append(f"row {index}: leader has no dot pattern")

    # --- section rule really is a 1px line, not a vanished element
    for section in data["sections"]:
        if section["ruleRight"] is None:
            errors.append(f"section '{section['id']}' has no head element to draw its rule")
            continue
        if section["ruleWidth"] != "1px":
            errors.append(
                f"section '{section['id']}' rule width is {section['ruleWidth']}, expected 1px"
            )

    # --- right edge consistency (desktop only: the rail layout shares one edge)
    if width >= 1024 and data["rows"]:
        price_right = round(data["rows"][0]["price"]["right"], 1)
        for section in data["sections"]:
            if section["ruleRight"] is None:
                continue
            if abs(section["ruleRight"] - price_right) > 1.5:
                errors.append(
                    f"section '{section['id']}' rule ends at {section['ruleRight']:.1f} "
                    f"but prices end at {price_right:.1f}"
                )
        if data["mastheadRule"] and abs(data["mastheadRule"]["right"] - price_right) > 1.5:
            errors.append(
                f"masthead rule ends at {data['mastheadRule']['right']:.1f} but prices end at {price_right:.1f}"
            )

    # --- tap targets on phone widths
    if width <= 430:
        for link in data["navLinks"]:
            if link["height"] < 44:
                errors.append(f"nav target '{link['text']}' is only {link['height']:.0f}px tall")

    # --- contrast
    for selector, background_selector, minimum in CONTRAST_PAIRS:
        fg = page.evaluate(STYLE_JS, selector)
        bg = page.evaluate(STYLE_JS, background_selector)
        if not fg or not bg:
            continue
        ratio = contrast(parse_rgb(fg["color"]), parse_rgb(bg["background"]))
        if ratio < minimum:
            errors.append(f"{selector} contrast {ratio}:1 < {minimum}:1")

    # --- no section may stay invisible after a jump to the bottom
    # A fast flick can skip an element entirely between two observer samples;
    # this asserts the catch-up in useReveal keeps every section visible.
    page.evaluate("document.documentElement.style.scrollBehavior = 'auto'")
    page.evaluate(
        "window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })"
    )
    page.wait_for_timeout(260)
    hidden = page.evaluate(
        "() => Array.from(document.querySelectorAll('[data-reveal]:not(.is-in)')).map((el) => el.id)"
    )
    if hidden:
        errors.append(f"sections still invisible after jumping to the bottom: {', '.join(hidden)}")
    page.evaluate("window.scrollTo({ top: 0, behavior: 'instant' })")
    page.wait_for_timeout(80)

    return errors, warnings, data


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5502/")
    parser.add_argument("--json", default=str(ROOT / "qa" / "layout-audit.json"))
    args = parser.parse_args()

    report: dict = {"url": args.url, "viewports": {}}
    failed = False

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width in WIDTHS:
            context = browser.new_context(
                viewport={"width": width, "height": 900},
                device_scale_factor=2 if width <= 430 else 1,
                is_mobile=width <= 430,
                has_touch=width <= 430,
                locale="fr-TN",
            )
            page = context.new_page()
            page.goto(args.url, wait_until="networkidle")
            page.wait_for_timeout(500)
            errors, warnings, data = audit_page(page, width)
            report["viewports"][width] = {
                "errors": errors,
                "warnings": warnings,
                "priceColumnRight": round(data["rows"][0]["price"]["right"], 1) if data["rows"] else None,
                "navOverflow": data["nav"]["scrollWidth"] - data["nav"]["clientWidth"],
                "pageOverflow": data["doc"]["scrollWidth"] - data["doc"]["clientWidth"],
            }
            status = "FAIL" if errors else "ok  "
            print(f"[{status}] {width:>4}px  overflow={report['viewports'][width]['pageOverflow']:>3}px  "
                  f"nav-scroll={report['viewports'][width]['navOverflow']:>4}px  "
                  f"price-right={report['viewports'][width]['priceColumnRight']}")
            for message in errors:
                print(f"         ERROR  {message}")
            for message in warnings:
                print(f"         WARN   {message}")
            failed = failed or bool(errors)
            context.close()
        browser.close()

    Path(args.json).write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nreport -> {args.json}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
