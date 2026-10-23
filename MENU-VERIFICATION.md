# Menu verification

> **This file is not published on the website.** It records where every price
> came from and what still needs the owner's confirmation.

## Source of truth

The original photo of the Café Foundou board **was not present in the project
folder**. Nothing here was read from an image in this repository, and nothing
was invented to fill a gap. Every value below comes from the project brief:

1. the board prices transcribed in the brief,
2. the owner's +1.000 DT increase on regular coffees (applied **once**), and
3. the owner's later price updates, which override the board.

The app reads all of it from one file: `src/data/menu.ts`. Prices are stored as
integers in **millimes** (`3500` = `3.500 DT`) and rendered by
`formatPriceWithUnit` as `3.500 DT`.

Item names are reproduced as supplied. In particular **“Cappucin” is spelled
that way on the board**; it is not auto-corrected to “Cappuccino”.

## Applied coffee increase

The owner asked for +1.000 DT on the five regular coffees. It is applied once,
to the original board price:

| Item | Board price | +1.000 DT | Published |
|---|---:|---:|---:|
| Express | 2.500 DT | **3.500 DT** | yes |
| Cappucin | 3.000 DT | **4.000 DT** | yes |
| Direct | 3.500 DT | **4.500 DT** | yes |
| Américain | 3.000 DT | **4.000 DT** | yes |
| Spécial / Arôme | 1.000 DT | **2.000 DT** | yes |

`COFFEE_INCREASE = 1000` exists as a named constant, but no code adds it at
runtime: the resulting prices are stored explicitly, so a future price change
cannot silently apply the increase twice.

## Owner-updated prices

These override the board and are marked `source: 'owner-update'`.

| Category | Item | Price | Published |
|---|---|---:|---:|
| Chocolats | Chocolat chaud | **6.000 DT** | yes |
| Chocolats | Chocolat au lait | **3.000 DT** | yes |
| Douceurs | Gâteaux aux noisettes | **8.500 DT** | yes |
| Jus & Sodas | Soda | **3.500 DT** | yes |
| Jus & Sodas | Jus d'orange | **4.000 DT** | yes |
| Jus & Sodas | Jus de banane | **7.000 DT** | yes |
| Jus & Sodas | Jus de fraise | **7.000 DT** | yes |

## Board prices kept unchanged

Marked `source: 'board'`.

| Category | Item | Price | Published |
|---|---|---:|---:|
| Thés & Infusions | Thé infusion | **2.500 DT** | yes |
| Thés & Infusions | Menthe | **1.000 DT** | yes |
| Smoothies & Milkshakes | Milk-shake vanille | **7.000 DT** | yes |
| Smoothies & Milkshakes | Smoothie vanille | **6.000 DT** | yes |
| Smoothies & Milkshakes | Smoothie café | **6.000 DT** | yes |
| Cocktails | Mojito | **5.000 DT** | yes |
| Cocktails | Mojito Blue | **6.000 DT** | yes |
| Cocktails | Mojito Red | **6.000 DT** | yes |
| Eaux | Eau 1,5 L | **2.000 DT** | yes |
| Eaux | Eau 0,5 L | **1.200 DT** | yes |
| Eaux | Bouteille en verre | **2.500 DT** | yes |
| Douceurs | Fruit sec au choix | **2.000 DT** | yes |

**Total: 27 items in 8 categories, 24 published.**

## Awaiting confirmation

These four points are unresolved. The app does not guess them.

| # | Subject | What is known | What is not | Effect in the app |
|---|---|---|---|---|
| 1 | **Thé** | Appears on the board next to “Thé infusion 2.500” and “Menthe 1.000”, but its own price was masked / unreadable | The price | `price: null`, `status: 'pending'` → hidden from the public menu, shown in the admin as “À confirmer” |
| 2 | **Citronnade** | Name appears on the board | Price, and whether it is a house lemonade or a bottled drink | `pending`, hidden from the public menu |
| 3 | **Cheesecake** | Appears under desserts | Whether it is available and at what price | `pending`, hidden from the public menu |
| 4 | **Gâteaux aux noisettes** | Owner supplied 8.500 DT | Whether it **replaces** “Gâteaux Chocolat” or is an additional item | Only “Gâteaux aux noisettes” exists in the data; “Gâteaux Chocolat” was not added |

### Why `pending` rather than a placeholder price

`publishedCategories()` filters on `status === 'confirmed' && visible`. A pending
item can never reach the public menu, cannot be published by the prototype's
“Publier” action, and is counted separately in the dashboard (“À confirmer”).
An empty price in the editor re-marks an item as pending. This makes it
impossible to show `0.000 DT` or a half-remembered number to a customer.

## Owner sign-off needed

Please confirm or correct the following before this menu is considered final.
The prices below are **not** in the app yet.

- [ ] Thé — price: `__________ DT`
- [ ] Citronnade — price: `__________ DT`; house-made or bottled? `__________`
- [ ] Cheesecake — available? `yes / no`; price: `__________ DT`
- [ ] Gâteaux aux noisettes — does it replace “Gâteaux Chocolat”? `replaces / additional`
- [ ] Is “Gâteaux Chocolat” still sold? If yes, price: `__________ DT`
- [ ] Any other board item missing from the list above? `__________`

## What the automated tests assert

`src/data/menu.test.ts` pins the data, so an accidental edit fails CI:

- 27 items, 8 categories, 24 published items;
- the five coffee prices are exactly `3500 / 4000 / 4500 / 4000 / 2000` and
  `source === 'coffee-increase'` with the expected `originalPrice`;
- every owner update is present at the exact millime value;
- every board price is unchanged;
- pending items (`the-simple`, `citronnade`, `cheesecake`) have `price: null`,
  never appear in `publishedCategories()`, and every published item has a
  non-null price and `visible: true`;
- “Cappucin” is spelled exactly as on the board.

`src/lib/price.test.ts` asserts the display format (`3.500 DT`, `1.200 DT`) and
that the editor rejects an ambiguous price such as `1 200` — with a space, it
could be read as 1.200 DT or 1 200 DT, so it is refused rather than guessed.
