# Café Foundou — digital menu

A mobile-first QR menu for **Café Foundou**, a Tunisian café. Warm paper, espresso
ink, one caramel accent, a ledger of prices — no product photography, no stock
imagery, no invented details.

The repository contains two things:

|                             | What it is                                                               | Status                                      |
| --------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| **Public menu** (`#/`)      | The customer-facing card. 8 categories, 24 published items.              | Production-ready front end                  |
| **Owner space** (`#/admin`) | An **unprotected visual prototype** of the price editor. In-memory only. | Design prototype — do not use for real data |

There is no backend, no database, no analytics, no third-party request and no
credential handling anywhere in this project.

**Preview:** <https://m-stoufa.github.io/Foundou/> — public menu at `/Foundou/`,
owner prototype at `/Foundou/#/admin`.

---

## Quick start

```bash
npm ci
npm run dev          # http://127.0.0.1:5502/
```

```bash
npm run build        # type-check + production build into dist/
npm run preview      # serve dist/ on http://127.0.0.1:5503/
```

Node 22+ is expected (built and tested on Node 24).

## Routes

| URL                 | View                                            |
| ------------------- | ----------------------------------------------- |
| `#/`                | Public menu                                     |
| `#/c/<category-id>` | Public menu, scrolled to a category (deep link) |
| `#/admin`           | Sign-in **design prototype**                    |
| `#/admin/dashboard` | Editor **design prototype**                     |

Hash routing is deliberate: GitHub Pages serves static files and cannot rewrite
unknown paths, and hash URLs make the same `dist/` work at a repository root,
under a project sub-path, or on a custom domain. It also means a route is **not**
a security boundary — see [ADMIN-PROTOTYPE.md](./ADMIN-PROTOTYPE.md).

The admin route is reachable by URL but deliberately **not linked** from the
public menu. It is a prototype, not a hidden feature.

## Scripts

| Script                   | What it does                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `npm run dev`            | Vite dev server on port 5502                                                       |
| `npm run build`          | `tsc -b` + Vite production build                                                   |
| `npm run preview`        | Preview the built output on port 5503                                              |
| `npm test`               | Vitest + Testing Library (53 tests)                                                |
| `npm run typecheck`      | TypeScript, no emit                                                                |
| `npm run lint:js`        | ESLint (flat config, React hooks rules)                                            |
| `npm run lint:css`       | Stylelint                                                                          |
| `npm run qa:shots`       | Playwright screenshots + console/network report for the menu                       |
| `npm run qa:admin-shots` | Screenshots of the admin in its interactive states                                 |
| `npm run qa:a11y`        | axe-core (WCAG 2.2 A/AA) on every route at 320/390/768/1440                        |
| `npm run qa:admin`       | Layout, contrast, tap-target and dialog invariants at 9 widths                     |
| `npm run qa:content`     | Exact menu data, no unresolved items, admin in-memory semantics, no network writes |
| `npm run format`         | Prettier                                                                           |

QA scripts need Python 3 with `playwright` and Pillow installed
(`python3 -m pip install playwright pillow && python3 -m playwright install chromium`),
plus `tesseract` for the OCR parts of a manual review.

## Project layout

```
src/
  data/menu.ts          single source of truth: 27 items, 8 categories, provenance
  lib/price.ts          millimes → "3.500", strict parser for the editor
  lib/router.ts         tiny hash router + route constants
  lib/hooks.ts          reveal-on-scroll, active section, nav offset, scroll-to
  components/           public menu (Brand, CategoryNav, MenuSection, MenuRow…)
  admin/                prototype: draft reducer, dashboard, login, modal, toasts
  styles/               tokens.css · base.css · menu.css · admin.css
  test/                 jsdom stubs + component/data tests
qa/                     Playwright audits and captures (not shipped)
public/                 favicon.svg, apple-touch-icon.png
```

Prices are **integers in millimes** (`3500` = `3.500 DT`). Written as decimals
they would drift; as integers the tests can assert them exactly. See
[MENU-VERIFICATION.md](./MENU-VERIFICATION.md) for every price and its source.

## Design system

- **Palette** — paper `#fbf7f0`, surface `#fffdfa`, espresso ink `#241c17`,
  caramel `#9c5f2e`, hairlines `#d8c7ae`. The admin's dark chrome is
  `.tone-espresso` (same tokens, inverted surface values).
- **Type** — Fraunces Variable (display) and Inter Variable (text), both
  **self-hosted** through `@fontsource-variable`. No Google Fonts request, no
  external CDN, no font flash from a third party.
- **Motion** — CSS transitions and one IntersectionObserver reveal. No animation
  library. Every duration collapses under `prefers-reduced-motion: reduce`.
- **Layout** — one content column on phones; a category rail plus the same column
  on desktop, sharing a single right edge. The category strip is a real scroll
  container with a fading mask and a sliding accent indicator.
- **No photography** — the café's logo, address, phone, hours and photo assets
  were not supplied, so none were invented. The identity is a typographic
  monogram.

## Accessibility

- Semantic landmarks, one `h1` per view, labelled sections, skip link.
- All interactive controls are native `button`/`a`/`input`; the dialog is
  hand-built with a focus trap, Escape, `aria-modal`, and focus restoration.
- 44px tap targets on phones (icon buttons, inputs, buttons, links).
- Text contrast checked against the composited background, not just the token
  pair: `npm run qa:admin` and `qa/layout_audit.py` fail on anything below 4.5:1.
- `npm run qa:a11y`: **0 axe violations** on 16 route/width combinations
  (menu, sign-in, dashboard, dashboard with the editor dialog open).
  axe reports one `incomplete` `color-contrast` check per page because the body
  uses a gradient background; those pairs are measured explicitly by the
  Playwright audits instead.

Verified in Chromium only. It has not been tested on a physical iOS/Android
device, in Safari or in Firefox.

## Deployment (GitHub Pages)

`vite.config.ts` sets `base: './'`, so the build works from a repository
sub-path without configuration.

The live site is deployed by `.github/workflows/deploy.yml`: every push to
`main` runs `npm ci && npm run build`, uploads `dist/` as a Pages artifact and
deploys it. Pages is configured with **Source: GitHub Actions**.

- Public menu: <https://m-stoufa.github.io/Foundou/>
- Owner prototype: <https://m-stoufa.github.io/Foundou/#/admin>

The deployed build is the same bundle that passed the local audits: all 56
production captures (11 menu widths/states + 45 admin states) are pixel-identical
to the verified local build, and `qa/verify_content.py` passes 34/34 against the
live URL with no console, page or network errors.

To deploy manually instead:

```bash
npm run build
# upload dist/ as a Pages artifact, or publish it to a gh-pages branch
```

`.nojekyll` is not required because no path starts with an underscore, but the
deployment workflow copies `dist/` as-is. The site is a static SPA with hash
routes, so no 404 rewrite rule is needed.

## Honest limitations

- **Menu photo not provided.** Every price comes from the project brief, not
  from an original board image in this folder. Four data points still need the
  owner's confirmation — see [MENU-VERIFICATION.md](./MENU-VERIFICATION.md).
- **The admin is a design prototype.** No authentication, no persistence, no
  server, and it says so on screen. Read
  [ADMIN-PROTOTYPE.md](./ADMIN-PROTOTYPE.md) before showing it to anyone as a
  product.
- **Visual QA was measured, not eyeballed.** Screenshots were reviewed with
  OCR and pixel measurements (bounding boxes, colour sampling, contrast maths),
  which catches clipping, overlap, alignment and contrast, but is weaker than a
  human art director at judging taste.
- **`npm audit`** reports a high-severity advisory in `braces` (via stylelint's
  `micromatch`). It is dev-only and there is no fixed release; it is documented
  rather than force-downgraded.

## Credits

Typefaces: [Fraunces](https://fonts.google.com/specimen/Fraunces) and
[Inter](https://rsms.me/inter/), both SIL Open Font License, self-hosted.
Icons: [Lucide](https://lucide.dev), ISC licence.

Café Foundou's name and prices belong to the café. This repository contains no
photographs and no personal data.
