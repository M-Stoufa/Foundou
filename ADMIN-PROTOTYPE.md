# Owner space — **design prototype only**

> **Do not use this screen to manage the real menu, and do not enter a real
> password.** It has no authentication, no database and no server. Everything
> you change disappears when you reload, and the screen says so in French at
> the top of every admin page.

This document explains what the prototype is, what it deliberately is not, and
what it would take to turn it into a product.

## What it is

- A **visual and interaction prototype** of the owner's price editor, built with
  the same design system as the public menu.
- A working **in-memory draft**: you can edit, add, delete, hide, reorder items
  and reorder categories, then reset to the original menu.
- A demonstration of the screens, copy and states a real admin will need
  (empty category, pending price, validation error, destructive confirmation,
  “publish unavailable”).

## What it is not

| Not this | Why |
|---|---|
| A login | The form is a design mock. Its two inputs are **uncontrolled**: their values are never read into React state, never validated, never stored, never sent. Submitting only waits 650 ms and changes the view. |
| A protected route | `#/admin/dashboard` opens directly. A client-side guard over a static bundle would be theatre, so none was added. |
| Persistent | Draft state lives in a `useReducer` inside `AdminApp`. A reload, or navigating to the public menu and back, restores the original menu. |
| Connected | No `fetch`, no `XMLHttpRequest`, no WebSocket, no storage API, no analytics. |
| Secret | It displays only data that is already public on the menu, plus three “price to confirm” rows. It contains no personal data and no credentials. |

## How to open it

- Sign-in design: `#/admin`
- Dashboard: `#/admin/dashboard`

The admin is reachable by URL but **not linked from the public menu**. There is
no password to guess because there is nothing to unlock. On the sign-in screen,
“Remplir le compte de démonstration” fills `demo@cafefoundou.tn` /
`demo-foundou` so nobody is tempted to type their own credentials. The notice
states twice that no verification happens and no data is sent or kept.

If this build is published on GitHub Pages, **the prototype is public**. That is
acceptable only because it exposes nothing private. Do not add real data to it
without building the backend first.

## What the prototype actually does

- 3 stat cards: published / hidden / price-to-confirm counts.
- 8 category cards, each with reorder-category controls, an “Ajouter” action,
  and per-item reorder / edit / hide / delete controls.
- Item editor: name, price, optional precision. Price is parsed strictly
  (`3.500`, `3,500`, `3`), rejects internal spaces (`1 200`), caps at 200.000 DT
  and keeps the item unpublished while the price is empty.
- Hiding an item, saving an edit or deleting shows a toast that ends in
  **“non persisté”**, because that is the truth.
- “Publier” opens an honest dialog: publication needs a database and a server,
  neither of which exists here.
- “Réinitialiser” restores the original menu after confirmation.

## Design decisions

- **Light paper content, espresso chrome.** The dashboard is a tool, read and
  tapped on a phone in a café. The sticky bar (69 px on phones, 65 px on
  desktop) carries identity and escape routes; the content stays on paper so
  prices are as legible as on the public menu.
- **The prototype warning is part of the layout**, not a dismissible toast. A
  banner that can be dismissed is a banner that will be forgotten.
- **Pending prices are visible here and nowhere else.** The admin is where the
  owner resolves them; the public menu never shows an unconfirmed price.
- **44 px targets on phones**, including the five icon actions per row; at
  ≥768 px they shrink to 32 px for a mouse.
- **Two concrete actions per category head** (reorder, add) plus five per item,
  with accessible names (`Modifier Express`, `Masquer Express`, …) rather than
  tooltips only.
- **French copy** throughout, matching the café and the menu.

## Files

```
src/admin/
  AdminApp.tsx        shell, reducer, toast queue
  AdminLogin.tsx      uncontrolled sign-in mock + prototype notices
  AdminDashboard.tsx  stats, categories, item rows, confirmations
  ItemEditor.tsx      add/edit form with strict price parsing
  Modal.tsx           focus trap, Escape, scroll lock, focus restoration
  ConfirmDialog.tsx   destructive confirmation with fake latency
  Toasts.tsx          transient “non persisté” messages
  draftStore.ts       pure reducer: add/update/remove/toggle/move/reset
src/styles/admin.css  dashboard, dialog, toast and sign-in styles
```

## Roadmap to a real owner space

In order. Nothing below exists yet.

1. **Server-side authentication.**
   - One owner account, created out of band; Argon2id password hash.
   - Session cookie: `HttpOnly; Secure; SameSite=Lax`, rotated on login.
   - Rate limiting and lockout on the login endpoint; CSRF token on writes.
   - Password reset by signed, single-use, short-lived email link.
   - Never a client-side password check, never a credential in the bundle.
2. **Database.** PostgreSQL with `categories`, `items`, `menu_versions` and
   `audit_log`. Prices as integer millimes. Soft-delete for items.
3. **Authorised API.** Every write checks the session and role server-side.
   Input validation and bounds live on the server, not only in the form.
4. **Draft → publish.** The editor writes a draft; “Publier” creates an
   immutable menu version and makes it current. The public menu serves the
   published version from cache, not the mutable draft.
5. **Audit log.** Who changed what, when, before and after. The owner should be
   able to answer “who lowered the Mojito price?”.
6. **Operations.** Backups with restore drills, error monitoring, uptime checks,
   a strict CSP, HSTS, dependency updates, and a documented incident path.
7. **Review.** Threat model the auth and publish flows, and test them on real
   iOS/Android devices and with a screen reader.

Until step 1 ships, the only safe deployment of this screen is as a **public
demo with clearly fictional content** — which is what it is now.

## Verification evidence

Measured in Chromium via Playwright (numbers, not impressions):

- `npm run qa:admin` — 9 widths × 2 routes:
  - 0 px horizontal overflow, no element outside the viewport;
  - the bar, notice band and content column share one left edge (≤ 1.5 px);
  - sticky bar 69 px (phones) / 65 px (desktop), single row;
  - 44 px phone tap targets; inputs ≥ 16 px (no iOS zoom);
  - every text pair ≥ 4.5:1 (large numerals ≥ 3:1);
  - dialogs fully inside the viewport, footers visible, focus trapped and
    restored, Escape closes; toasts inside the viewport and legible.
- `npm run qa:a11y` — axe-core WCAG 2.2 A/AA: **0 violations** on menu,
  sign-in, dashboard and dashboard-with-dialog, at 320/390/768/1440.
- `npm test` — 53 tests, including the draft reducer and price parsing.
- Screenshots in `qa/shots/` (`a3-*`) cover sign-in, dashboard, editor,
  validation error, publish dialog, delete confirmation, toast and hidden row.

Not verified: Safari, Firefox, real iOS/Android hardware, screen readers
(VoiceOver/TalkBack/NVDA), and any real network behaviour — the last one cannot
exist until there is a backend.
