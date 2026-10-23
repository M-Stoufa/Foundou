# Café Foundou — digital menu

A mobile-first QR menu for **Café Foundou**, a Tunisian café. Warm paper,
espresso ink, a terracotta accent taken from the café's own logo, and a
photographic showcase for the three cakes the owner supplied.

The repository contains two surfaces:

|                             | What it is                                                                                         | Status                  |
| --------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------- |
| **Public menu** (`#/`)      | Customer-facing card: 8 categories, 28 published items, three cake photographs.                    | Ready to preview        |
| **Owner space** (`#/admin`) | Supabase-guarded sign-in and a browser-local menu editor. Nothing is published to a shared server. | Working local prototype |

The public menu is a static build and needs no backend. The owner space needs a
Supabase project configured through `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` in `.env.local`; without them the sign-in screen says
so and the public menu keeps working.

**Preview:** <https://m-stoufa.github.io/Foundou/> — public menu at `/Foundou/`,
owner sign-in at `/Foundou/#/admin`.

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

For the owner sign-in, create a git-ignored `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<public anon key>
```

Only the public anon key belongs in a Vite build. Never add a service-role key.
The dashboard route also checks an `owners` allow-list row for the signed-in
user before rendering.

## Routes

| URL                 | View                                                    |
| ------------------- | ------------------------------------------------------- |
| `#/`                | Public menu                                             |
| `#/c/<category-id>` | Public menu, scrolled to a category (deep link)         |
| `#/admin`           | Owner sign-in (Supabase Auth)                           |
| `#/admin/dashboard` | Owner editor — redirects to `#/admin` without a session |

Hash routing is deliberate: GitHub Pages serves static files and cannot rewrite
unknown paths, and hash URLs make the same `dist/` work at a repository root,
under a project sub-path, or on a custom domain. A route is **not** a security
boundary; the dashboard guard is a client-side gate in front of data that is
still browser-local. See [ADMIN-PROTOTYPE.md](./ADMIN-PROTOTYPE.md).

The admin route is reachable by URL but not linked from the public menu.

## Menu content

- **28 items in 8 categories**, all confirmed and visible.
- Prices are integers in millimes (`3500` = `3.500 DT`), rendered as `3.500 DT`.
- **Three supplied cake photographs** are attached by stable item id:
  - `gateaux-chocolat` → `chocola.jpg`
  - `gateaux-noisettes` → `noisete.jpg`
  - `cheesecake` → `cheese.jpg`
- The other 25 items stay typographic ledger rows. No stock photo was added to
  a product that was not photographed, and no menu item, price or description
  was invented.
- Every price and its provenance is documented in
  [MENU-VERIFICATION.md](./MENU-VERIFICATION.md).

## Scripts

| Script                   | What it does                                                      |
| ------------------------ | ----------------------------------------------------------------- |
| `npm run dev`            | Vite dev server on port 5502                                      |
| `npm run build`          | `tsc -b` + Vite production build                                  |
| `npm run preview`        | Preview the built output on port 5503                             |
| `npm test`               | Vitest + Testing Library (52 tests)                               |
| `npm run typecheck`      | TypeScript, no emit                                               |
| `npm run lint:js`        | ESLint (flat config, React hooks rules)                           |
| `npm run lint:css`       | Stylelint                                                         |
| `npm run qa:a11y`        | axe-core (WCAG 2.2 A/AA) on every route at 320/390/768/1440       |
| `npm run qa:admin`       | Layout, contrast, tap-target and dialog invariants at 9 widths    |
| `npm run qa:content`     | Exact menu data, photo mapping, local-draft semantics, auth guard |
| `npm run qa:shots`       | Screenshots + console/network report for the menu                 |
| `npm run qa:admin-shots` | Screenshots of the admin states                                   |
| `npm run format`         | Prettier                                                          |

QA scripts need Python 3 with `playwright` and Pillow installed
(`python3 -m pip install playwright pillow && python3 -m playwright install chromium`).

`qa:admin` and `qa:content` seed a synthetic Supabase session in the test
browser and mock the `owners` allow-list so the guarded dashboard can be
measured without real credentials. That test harness lives only in `qa/`; it is
not part of the application bundle.

## Project layout

```
src/
  assets/brand/         supplied Café Foundou logo (220 × 225 PNG)
  assets/menu/          three supplied cake photos + WebP 480/960/1280 variants
  data/menu.ts          single source of truth: 28 items, 8 categories
  data/menuStorage.ts   browser-local draft snapshot (localStorage)
  lib/price.ts          millimes → "3.500", strict parser for the editor
  lib/router.ts         tiny hash router + route constants
  lib/supabase.ts       optional Supabase client (never throws when unset)
  components/           public menu (Brand, CategoryNav, CakeGallery, MenuRow…)
  admin/                sign-in guard, draft reducer, dashboard, modals, toasts
  styles/               tokens.css · base.css · menu.css · admin.css
  test/                 jsdom stubs + component/data tests
qa/                     Playwright audits and captures (not shipped)
public/                 favicon.svg, apple-touch-icon.png
supabase/               database work in progress (not used by the menu yet)
```

## Design system

- **Palette** — paper `#faf5ec`, warm paper `#f3eadc`, surface `#fffdf8`,
  espresso ink `#211914`, terracotta `#b34a2c`, hairlines `#d9c8b0`. The admin
  chrome uses `.tone-espresso`, which reassigns the same tokens.
- **Type** — Fraunces Variable (display) and Inter Variable (text), both
  self-hosted through `@fontsource-variable`. No Google Fonts request and no
  external font CDN.
- **Photography** — the three cakes use responsive `<picture>` elements with
  WebP candidates at 480/960/1280 px and JPEG fallbacks, intrinsic dimensions
  and lazy loading. The wide chocolate photo spans the gallery; the two
  portrait photos sit side by side. Captions stay real DOM text, so names and
  prices remain selectable and searchable.
- **Logo** — the supplied artwork is used as-is, never redrawn or stretched. It
  is displayed at 62–76 px on the public menu, 40–42 px in the admin bar and
  50–66 px on the sign-in screen, all within the 220 px source for a sharp 2×
  rendering.
- **Motion** — CSS transitions and one IntersectionObserver reveal. Every
  duration collapses under `prefers-reduced-motion: reduce`.
- **Layout** — one content column on phones; a category rail plus the same
  column on desktop, sharing a single right edge.

## Accessibility

- Semantic landmarks, one `h1` per view, labelled sections, skip link.
- All interactive controls are native `button`/`a`/`input`; the dialog is
  hand-built with a focus trap, Escape, `aria-modal`, and focus restoration.
- 44 px tap targets on phones.
- Text contrast is measured against the composited background: both Playwright
  audits fail below 4.5:1 (large numerals below 3:1).
- `npm run qa:a11y`: **0 axe violations** on 16 route/width combinations.
  axe reports one `incomplete` colour-contrast check per page because the body
  uses a gradient; those pairs are measured explicitly by the Playwright audits.

Verified in Chromium only. It has not been tested on a physical iOS/Android
device, in Safari or in Firefox.

## Deployment (GitHub Pages)

`vite.config.ts` sets `base: './'`, so the build works from a repository
sub-path without configuration.

The live site is deployed by `.github/workflows/deploy.yml`: every push to
`main` runs `npm ci && npm run build`, uploads `dist/` as a Pages artifact and
deploys it. Pages is configured with **Source: GitHub Actions**. The current
work branch is not `main`; nothing is deployed by running the local commands
above.

The build was also checked **without** Supabase environment variables: the
public menu still renders all 8 sections and 28 items, and the sign-in screen
shows “Configuration manquante” instead of crashing. To use the owner sign-in
on a deployment, the two public Vite variables must be present at build time.

`.nojekyll` is not required because no path starts with an underscore. The site
is a static SPA with hash routes, so no 404 rewrite rule is needed.

## Honest limitations

- **The logo is a 220 × 225 crop.** The visible artwork sits inside a
  ~193 × 194 box. It is sharp at the sizes used here but is not a vector master;
  a larger original would be needed for print or a very large lock-up.
- **Only three products have photographs.** No image was attached to any other
  item, and no stock photo was used to fill the gaps.
- **The owner editor is browser-local.** Edits survive a reload on the same
  device through `localStorage`; another device still sees the default menu.
  “Publier” explains that shared publication needs a server and database; it
  does not fake a success.
- **The admin is a prototype.** It has a real Supabase sign-in and an owner
  allow-list check, but no server-side write API, no publish pipeline and no
  audit log. Read [ADMIN-PROTOTYPE.md](./ADMIN-PROTOTYPE.md) before treating it
  as a product.
- **No credentials are included.** Without a configured Supabase project there
  is no demo bypass; the sign-in screen says the configuration is missing.
- **Visual QA was measured, not eyeballed.** Screenshots were checked with
  geometry, colour sampling and contrast maths. That catches clipping, overlap,
  alignment and contrast, but is weaker than a human art director at judging
  taste.
- **`npm audit`** reports advisories in dev-only tooling. They are documented
  rather than force-downgraded.

## Credits

Typefaces: [Fraunces](https://fonts.google.com/specimen/Fraunces) and
[Inter](https://rsms.me/inter/), both SIL Open Font License, self-hosted.
Icons: [Lucide](https://lucide.dev), ISC licence.

Café Foundou's name, logo, photographs and prices belong to the café.
