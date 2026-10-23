#!/usr/bin/env python3
"""Functional content / behaviour verification against a running build.

Checks the *published* promises, not just layout:
  * the public menu prints exactly the 24 confirmed items, ordered, formatted
    "3.500 DT", and never the unresolved ones;
  * the admin prototype starts from the same data (27 items, 3 pending) and
    every change is in-memory only (a reload restores the original menu);
  * the sign-in form performs no network write at all.

Usage: python3 qa/verify_content.py [--url http://127.0.0.1:5503/]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent

EXPECTED: list[tuple[str, list[tuple[str, str]]]] = [
    (
        'Cafés',
        [
            ('Express', '3.500'),
            ('Cappucin', '4.000'),
            ('Direct', '4.500'),
            ('Américain', '4.000'),
            ('Spécial / Arôme', '2.000'),
        ],
    ),
    ('Chocolats', [('Chocolat chaud', '6.000'), ('Chocolat au lait', '3.000')]),
    ('Thés & Infusions', [('Thé infusion', '2.500'), ('Menthe', '1.000')]),
    (
        'Jus & Sodas',
        [
            ("Jus d'orange", '4.000'),
            ('Jus de banane', '7.000'),
            ('Jus de fraise', '7.000'),
            ('Soda', '3.500'),
        ],
    ),
    (
        'Smoothies & Milkshakes',
        [('Milk-shake vanille', '7.000'), ('Smoothie vanille', '6.000'), ('Smoothie café', '6.000')],
    ),
    ('Cocktails', [('Mojito', '5.000'), ('Mojito Blue', '6.000'), ('Mojito Red', '6.000')]),
    (
        'Eaux',
        [('Eau 1,5 L', '2.000'), ('Eau 0,5 L', '1.200'), ('Bouteille en verre', '2.500')],
    ),
    ('Douceurs', [('Gâteaux aux noisettes', '8.500'), ('Fruit sec au choix', '2.000')]),
]
UNRESOLVED = {'Thé', 'Citronnade', 'Cheesecake'}

results: list[dict] = []


def check(name: str, ok: bool, detail: str = '') -> None:
    results.append({'check': name, 'ok': bool(ok), 'detail': detail})
    print(f"[{'ok  ' if ok else 'FAIL'}] {name}" + (f"  {detail}" if detail else ''))


def norm(text: str) -> str:
    return ' '.join(text.replace('\u00a0', ' ').replace('\u202f', ' ').split())


def read_menu(page) -> list[dict]:
    return page.evaluate(
        """() => [...document.querySelectorAll('.section')].map(section => ({
            title: section.querySelector('.section__title')?.textContent?.trim() ?? '',
            rows: [...section.querySelectorAll('.row')].map(row => ({
                name: row.querySelector('.row__name')?.textContent?.trim() ?? '',
                price: row.querySelector('.row__price')?.textContent?.trim() ?? '',
            })),
        }))"""
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:5503/')
    args = parser.parse_args()

    console_errors: list[str] = []
    page_errors: list[str] = []
    writes: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ---------- public menu ----------
        for width in (390, 1440):
            context = browser.new_context(
                viewport={'width': width, 'height': 900},
                device_scale_factor=2 if width <= 430 else 1,
                locale='fr-TN',
            )
            page = context.new_page()
            page.on('console', lambda m: m.type == 'error' and console_errors.append(m.text))
            page.on('pageerror', lambda e: page_errors.append(str(e)))
            page.on(
                'request',
                lambda r: r.method not in ('GET', 'HEAD')
                and writes.append(f'{r.method} {r.url}'),
            )
            page.goto(args.url, wait_until='networkidle')
            page.wait_for_timeout(900)

            sections = read_menu(page)
            check(f'{width}px · 8 categories rendered', len(sections) == 8, f'got {len(sections)}')

            flat: list[tuple[str, str, str]] = []
            for section in sections:
                for row in section['rows']:
                    flat.append((section['title'], norm(row['name']), norm(row['price'])))

            expected_flat = [(cat, name, f'{price} DT') for cat, items in EXPECTED for name, price in items]
            check(
                f'{width}px · exact published menu (24 items, order, names, prices)',
                flat == expected_flat,
                '' if flat == expected_flat else f'first diff: {next(((a, b) for a, b in zip(flat, expected_flat) if a != b), ("len", len(flat)))}',
            )

            names = {name for _, name, _ in flat}
            check(
                f'{width}px · unresolved items hidden',
                not (names & UNRESOLVED),
                f'leaked: {sorted(names & UNRESOLVED)}' if names & UNRESOLVED else '',
            )
            check(
                f'{width}px · every price matches "N.NNN DT"',
                all(len(price.split()) == 2 and price.endswith(' DT') and price[:-3].replace('.', '').isdigit() for _, _, price in flat),
            )
            check(
                f'{width}px · coffee rise applied exactly once',
                dict((n, p) for _, n, p in flat if n in {'Express', 'Cappucin', 'Direct', 'Américain', 'Spécial / Arôme'})
                == {'Express': '3.500 DT', 'Cappucin': '4.000 DT', 'Direct': '4.500 DT', 'Américain': '4.000 DT', 'Spécial / Arôme': '2.000 DT'},
            )
            check(
                f'{width}px · no app-level horizontal overflow',
                page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),
                f"scrollWidth={page.evaluate('document.documentElement.scrollWidth')}",
            )

            # Category navigation actually goes somewhere.
            page.click('.catnav__link >> nth=7')
            page.wait_for_timeout(700)
            active = page.evaluate(
                """() => [...document.querySelectorAll('.catnav__link, .rail__link')]
                    .filter(a => a.getAttribute('aria-current') === 'true')
                    .map(a => a.textContent.trim())"""
            )
            check(f'{width}px · category nav activates Douceurs', bool(active) and 'Douceurs' in active[0], f'active={active}')

            context.close()

        # ---------- admin prototype ----------
        context = browser.new_context(viewport={'width': 390, 'height': 844}, locale='fr-TN')
        page = context.new_page()
        page.on('console', lambda m: m.type == 'error' and console_errors.append(m.text))
        page.on('pageerror', lambda e: page_errors.append(str(e)))
        page.on(
            'request',
            lambda r: r.method not in ('GET', 'HEAD') and writes.append(f'{r.method} {r.url}'),
        )

        page.goto(args.url + '#/admin', wait_until='networkidle')
        page.wait_for_timeout(500)
        check('admin · sign-in renders', page.locator('form.login__form').count() == 1)
        check(
            'admin · inputs are uncontrolled and autocomplete off',
            page.evaluate(
                """() => [...document.querySelectorAll('.login__form input')]
                    .every(i => i.getAttribute('autocomplete') === 'off')"""
            ),
        )
        check(
            'admin · "no verification" notice present',
            page.locator('text=Aucune vérification n’est faite').count() > 0
            or page.locator('.login__notice').inner_text().find('aucune vérification') >= 0,
        )

        page.click('.login__demo-btn')
        page.click('button[type="submit"]')
        page.wait_for_selector('.admin__bar', timeout=10000)
        check('admin · demo sign-in reaches the dashboard', '#/admin/dashboard' in page.url, page.url)
        check('admin · no network write during sign-in', not writes, str(writes))

        stats = [norm(t) for t in page.locator('.astat__value').all_inner_texts()]
        check('admin · stats 24 / 0 / 3', stats == ['24', '0', '3'], str(stats))
        check('admin · 27 items incl. 3 pending', page.locator('.aitem').count() == 27, str(page.locator('.aitem').count()))
        check('admin · prototype warning visible', 'non protégé' in page.locator('.admin__notice').inner_text())

        # Hide one item -> in-memory change + toast.
        page.click('button[aria-label="Masquer Express"]')
        page.wait_for_timeout(300)
        stats = [norm(t) for t in page.locator('.astat__value').all_inner_texts()]
        check('admin · hiding updates stats + toast', stats[:2] == ['23', '1'] and page.locator('[role="status"]').count() > 0, str(stats))

        # Edit a price.
        page.click('button[aria-label="Modifier Express"]')
        page.wait_for_selector('#item-editor')
        page.fill('input[name="item-name"]', 'Express')
        page.fill('input[name="item-price"]', '4.000')
        page.click('button[form="item-editor"]')
        page.wait_for_timeout(900)
        row = page.locator('.aitem', has_text='Express').first
        check('admin · edit persists in the draft', '4.000 DT' in row.inner_text(), norm(row.inner_text()))

        # Invalid price is refused.
        page.click('button[aria-label="Modifier Express"]')
        page.wait_for_selector('#item-editor')
        page.fill('input[name="item-price"]', '1 200')
        page.click('button[form="item-editor"]')
        page.wait_for_timeout(250)
        check('admin · ambiguous price "1 200" rejected', page.locator('.field__error').count() > 0)
        page.keyboard.press('Escape')
        page.wait_for_timeout(350)
        check('admin · Escape closes the editor', page.locator('#item-editor').count() == 0)

        # Add a temporary item, publish, then delete it.
        page.locator('.acat').first.locator('button:has-text("Ajouter")').click()
        page.wait_for_selector('#item-editor')
        page.fill('input[name="item-name"]', 'Article QA')
        page.fill('input[name="item-price"]', '9.000')
        page.click('button[form="item-editor"]')
        page.wait_for_timeout(900)
        check('admin · add item works', page.locator('.aitem', has_text='Article QA').count() == 1)

        page.click('.admin-head__actions button:has-text("Publier")')
        page.wait_for_timeout(350)
        dialog = norm(page.locator('[role="dialog"]').inner_text())
        check(
            'admin · publish dialog is honest about no database',
            'aucun' in dialog.lower() and ('base de données' in dialog.lower() or 'non persist' in dialog.lower()),
        )
        page.locator('[role="dialog"] button:has-text("Compris")').click()
        page.wait_for_timeout(400)
        check(
            'admin · publish is unavailable, menu unchanged',
            page.locator('[role="dialog"]').count() == 0 and page.locator('.aitem').count() == 28,
        )

        page.click('button[aria-label="Supprimer Article QA"]')
        page.wait_for_timeout(300)
        page.locator('[role="dialog"] button:has-text("Supprimer")').click()
        page.wait_for_timeout(400)
        check('admin · delete works', page.locator('.aitem', has_text='Article QA').count() == 0)

        # Reload: everything must reset (in-memory only).
        page.reload(wait_until='networkidle')
        page.wait_for_timeout(600)
        stats = [norm(t) for t in page.locator('.astat__value').all_inner_texts()]
        check('admin · reload discards all changes', stats == ['24', '0', '3'], str(stats))

        check('admin · still no network write after full session', not writes, str(writes))

        context.close()
        browser.close()

    check('no console errors', not console_errors, str(console_errors[:3]))
    check('no page errors', not page_errors, str(page_errors[:3]))

    payload = {
        'url': args.url,
        'passed': sum(1 for r in results if r['ok']),
        'failed': sum(1 for r in results if not r['ok']),
        'results': results,
        'console_errors': console_errors,
        'page_errors': page_errors,
        'network_writes': writes,
    }
    (ROOT / 'qa' / 'content-verification.json').write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8'
    )
    print(f"\n{payload['passed']} passed, {payload['failed']} failed")
    return 1 if payload['failed'] else 0


if __name__ == '__main__':
    sys.exit(main())
