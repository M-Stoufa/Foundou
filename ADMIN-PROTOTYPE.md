# Owner space — working local prototype

> **The editor is not a shared CMS.** Sign-in is verified by Supabase Auth, but
> every edit is stored in **this browser only** through `localStorage`.
> “Publier” explains that shared publication needs a server and a database; it
> does not fake success. Do not use this screen as the café's only copy of a
> price change.

## What it is

- A Supabase-guarded sign-in (`#/admin`) and a dashboard (`#/admin/dashboard`).
- A **browser-local draft**: edit, add, delete, hide, reorder items and
  reorder categories, then reset to the default menu.
- A demonstration of the screens and states a real admin needs: empty category,
  pending price, validation error, destructive confirmation, storage failure,
  and “publication unavailable”.
- A working preview of the public menu: the same browser sees its local draft,
  so a price edit can be checked immediately on `#/`.

## What it is not

| Not this                  | Why                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A multi-device CMS        | The draft lives in `localStorage`. Another device sees the default menu.                                         |
| A publish pipeline        | No write API, no shared menu version, no cache invalidation.                                                     |
| A server-side admin       | The browser edits a local snapshot; no menu data is sent to Supabase.                                            |
| An audit trail            | There is no record of who changed what.                                                                          |
| A finished security story | The route guard is client-side. Real protection needs server-side authorisation and RLS on every read and write. |

## How to open it

1. Add a git-ignored `.env.local` with the public Supabase values:

   ```dotenv
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<public anon key>
   ```

2. Create an owner account in Supabase Auth and add its `user_id` to the
   `owners` table. The dashboard checks that row before rendering.
3. Run `npm run dev` and open `#/admin`.

There is **no demo password** and no client-side bypass in the app. Without the
environment variables, the sign-in screen shows “Configuration manquante” and
the public menu continues to work. The QA scripts use a synthetic session in
the test browser only, and mock the allow-list response; that harness is not
shipped.

## What actually happens to an edit

1. `AdminApp` initialises the draft from `currentMenu()`.
2. `currentMenu()` returns the saved snapshot in `localStorage` when it is valid,
   otherwise the default `MENU`.
3. Every reducer action is written back synchronously with `saveStoredMenu()`.
4. If the browser refuses the write (private mode, quota, disabled storage), the
   edit stays in memory for the tab and a persistent **“Stockage local
   indisponible”** alert appears. No success message is shown.
5. A reload on the same browser restores the draft. “Réinitialiser” restores the
   eight default categories after confirmation.
6. The public menu in the same browser reads the same snapshot. Other devices
   read their own storage or the default menu.

The dashboard copy and toasts use **“brouillon local”**, never “publié sur le
site”. The publish dialog lists what is missing: a server, a shared database,
server-side authentication and an audit log.

## Design decisions

- **Light paper content, espresso chrome.** The sticky bar (69 px on phones,
  68 px on desktop) carries identity and escape routes; the content stays on
  paper so prices are as legible as on the public menu.
- **The storage warning is part of the layout**, not a dismissible toast. It is
  shown only when a write actually fails.
- **Pending prices stay visible in the admin.** The public menu never renders an
  unconfirmed price.
- **44 px targets on phones**, including the icon actions per row; at ≥768 px
  they shrink to 32 px for a mouse.
- **Accessible names** on every icon action (`Modifier Express`,
  `Masquer Express`, …), not tooltips alone.
- **French copy** throughout, matching the café and the menu.

## Files

```
src/admin/
  AdminApp.tsx         session guard, draft shell, toast queue
  AdminLogin.tsx       Supabase Auth sign-in + owner allow-list check
  AdminDashboard.tsx   stats, categories, item rows, confirmations
  ItemEditor.tsx       add/edit form with strict price parsing
  Modal.tsx            focus trap, Escape, scroll lock, focus restoration
  ConfirmDialog.tsx    destructive confirmation with busy state
  Toasts.tsx           transient local-draft messages
  draftStore.ts        pure reducer: add/update/remove/toggle/move/reset
src/data/menuStorage.ts  validated localStorage snapshot
src/lib/supabase.ts      optional client; missing config never throws
src/styles/admin.css     dashboard, dialog, toast and sign-in styles
```

## Roadmap to a real owner space

In order. Only the sign-in guard exists today.

1. **Server-side authorisation.** Enforce the owner role in the database with
   RLS policies; never trust a client-side guard alone. Add rate limiting,
   session rotation, CSRF protection and a password-reset flow.
2. **Database writes.** Persist categories and items as integer millimes, with
   soft-delete and an `audit_log`.
3. **Draft → publish.** “Publier” should create an immutable menu version and
   make it current; the public menu must serve the published version, not the
   mutable draft.
4. **Cache and delivery.** Invalidate the menu cache on publish and verify the
   public response.
5. **Operations.** Backups with restore drills, monitoring, uptime checks, a
   strict CSP, HSTS and dependency updates.
6. **Review.** Threat-model the auth and publish flows; test on real
   iOS/Android devices and with a screen reader.

## Verification evidence

Measured in Chromium via Playwright against the local build:

- `npm run qa:admin` — 9 widths × sign-in and dashboard:
  - 0 px horizontal overflow, no element outside the viewport;
  - the bar, notice band and content column share one left edge (≤ 1.5 px);
  - sticky bar 69 px (phones) / 68.2 px (desktop), one row at 320 px;
  - 44 px phone tap targets; inputs ≥ 16 px (no iOS zoom);
  - every text pair ≥ 4.5:1 (large numerals ≥ 3:1);
  - dialogs inside the viewport, footers visible, focus trapped and restored,
    Escape closes; toasts inside the viewport and legible.
- `npm run qa:a11y` — axe-core WCAG 2.2 A/AA: **0 violations** on menu,
  sign-in, dashboard and dashboard-with-dialog at 320/390/768/1440.
- `npm run qa:content` — **36/36** checks: exact 28-item menu, photo mapping,
  local-draft persistence across reload, honest publish dialog, and redirect to
  sign-in without a session.
- `npm test` — 52 tests, including the draft reducer and price parsing.

Not verified: Safari, Firefox, real iOS/Android hardware, screen readers
(VoiceOver/TalkBack/NVDA), Supabase RLS policies, and any real
multi-device/shared publication.
