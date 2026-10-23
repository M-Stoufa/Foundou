#!/usr/bin/env python3
"""Run axe-core against every route, at phone and desktop widths.

Usage:
    python3 qa/a11y_audit.py [--url URL] [--json PATH]

axe-core is injected from node_modules, so no network access is needed and the
exact ruleset is the one pinned in package.json. Violations are printed with
their WCAG tags and a sample target; the process exits non-zero if any
serious/critical violation is found.

The dashboard is also audited with its item-editor dialog open, because a
dialog is where focus, labelling and contrast mistakes usually hide.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

from supabase_qa import mock_owner_api, owner_session

ROOT = Path(__file__).resolve().parent.parent
AXE = ROOT / "node_modules" / "axe-core" / "axe.min.js"
WIDTHS = [320, 390, 768, 1440]

# WCAG 2.0/2.1/2.2 A + AA only. Best-practice rules are useful but noisy, and
# this audit is about conformance.
TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

RUN = """
async (tags) => {
  const result = await axe.run(document, {
    runOnly: { type: 'tag', values: tags },
    resultTypes: ['violations', 'incomplete'],
    rules: {
      // The prototype has no video/audio; nothing to caption.
      'video-caption': { enabled: false },
    },
  });
  const clean = (items) => items.map((item) => ({
    id: item.id,
    impact: item.impact,
    help: item.help,
    tags: item.tags,
    nodes: item.nodes.map((node) => ({
      target: node.target,
      html: (node.html || '').slice(0, 180),
      summary: (node.failureSummary || '').split('\\n').slice(0, 3).join(' | '),
    })),
  }));
  return { violations: clean(result.violations), incomplete: clean(result.incomplete) };
}
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:5502/")
    parser.add_argument("--json", default=str(ROOT / "qa" / "a11y.json"))
    args = parser.parse_args()

    if not AXE.exists():
        print(f"axe-core not found at {AXE} — run npm install first")
        return 2

    axe_source = AXE.read_text(encoding="utf-8")
    report: dict = {"url": args.url, "axe": str(AXE.relative_to(ROOT)), "runs": []}
    failures = 0

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width in WIDTHS:
            for route, tag in (
                ("#/", "menu"),
                ("#/admin", "admin-login"),
                ("#/admin/dashboard", "admin-dashboard"),
                ("#/admin/dashboard", "admin-editor"),
            ):
                context = browser.new_context(
                    viewport={"width": width, "height": 900},
                    device_scale_factor=1,
                    is_mobile=width <= 430,
                    has_touch=width <= 430,
                    locale="fr-TN",
                )
                needs_session = tag in ("admin-dashboard", "admin-editor")
                if needs_session and not owner_session(context):
                    print(f"[SKIP] {tag} {width}px: no local Supabase configuration")
                    context.close()
                    continue
                page = context.new_page()
                if needs_session:
                    mock_owner_api(page)
                page.goto(args.url + route, wait_until="networkidle")
                page.wait_for_timeout(500)
                if needs_session and page.locator(".admin__bar").count() == 0:
                    print(f"[FAIL] {tag} {width}px: dashboard guard did not open the editor")
                    failures += 1
                    context.close()
                    continue
                if tag == "admin-editor":
                    page.get_by_role("button", name="Modifier Express").first.click()
                    page.wait_for_timeout(400)

                lang = page.evaluate("() => document.documentElement.lang")
                page.add_script_tag(content=axe_source)
                result = page.evaluate(RUN, TAGS)
                violations = result["violations"]

                serious = [v for v in violations if v["impact"] in ("serious", "critical")]
                label = f"{tag} {width}px"
                print(
                    f"[{'FAIL' if serious else 'ok  '}] {label:<24} "
                    f"violations={len(violations):>2}  incomplete={len(result['incomplete'])}  lang={lang!r}"
                )
                for violation in violations:
                    print(f"         {violation['impact']:<8} {violation['id']}  ({len(violation['nodes'])} nodes)")
                    for node in violation["nodes"][:2]:
                        print(f"                  {node['target']}  {node['summary'][:150]}")

                report["runs"].append(
                    {
                        "route": route,
                        "tag": tag,
                        "width": width,
                        "lang": lang,
                        "violations": violations,
                        "incomplete": result["incomplete"],
                    }
                )
                failures += len(serious)
                context.close()
        browser.close()

    Path(args.json).write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nserious/critical violations: {failures}")
    print(f"report -> {args.json}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
