# Menu verification

> **This file is not published on the website.** It records the data contract
> implemented in `src/data/menu.ts` and how the public menu is checked.

## Source of truth

`src/data/menu.ts` is the only menu source. Prices are integers in **millimes**
(`3500` = `3.500 DT`) and are rendered as `3.500 DT`.

The current owner list is treated as final: **28 items in 8 categories, all
`status: 'confirmed'` and visible.** No item is hidden by a missing price.
Item names are reproduced as supplied, including **“Cappucin”**.

The three supplied cake photographs are attached by stable item id, never by
display name, so renaming an item in the admin cannot attach the wrong photo:

| Item id             | Menu name         | Photograph                            |
| ------------------- | ----------------- | ------------------------------------- |
| `gateaux-chocolat`  | Gâteaux chocolat  | `chocola.jpg` (1280 × 849, landscape) |
| `gateaux-noisettes` | Gâteaux noisettes | `noisete.jpg` (960 × 1280, portrait)  |
| `cheesecake`        | Cheese Cake       | `cheese.jpg` (960 × 1280, portrait)   |

The other 25 items have no photograph and no stock image.

## Applied coffee increase

The owner asked for +1.000 DT on the five regular coffees. It is stored once in
the final price; no code adds it at runtime.

| Item            | Original |    Published |
| --------------- | -------: | -----------: |
| Express         | 2.500 DT | **3.500 DT** |
| Cappucin        | 3.000 DT | **4.000 DT** |
| Direct          | 3.500 DT | **4.500 DT** |
| Américain       | 3.000 DT | **4.000 DT** |
| Spécial / Arôme | 1.000 DT | **2.000 DT** |

## Owner-updated prices

These items are marked `source: 'owner-update'`.

| Category   | Item               |        Price |
| ---------- | ------------------ | -----------: |
| CAFÉ       | Lait au chocolat   | **3.000 DT** |
| CAFÉ       | Chocolat chaud     | **6.000 DT** |
| THÉ        | Thé                | **3.000 DT** |
| THÉ        | Thé infusion       | **2.500 DT** |
| THÉ        | Fruit sec au choix | **2.000 DT** |
| THÉ        | Menthe             | **1.000 DT** |
| EAU        | Eau 1,5 L          | **2.000 DT** |
| EAU        | Eau 0,5 L          | **1.200 DT** |
| EAU        | Bouteille en verre | **2.500 DT** |
| JUS        | Jus banane         | **7.000 DT** |
| JUS        | Jus fraise         | **7.000 DT** |
| JUS        | Jus d'orange       | **4.000 DT** |
| JUS        | Citronnade         | **6.000 DT** |
| JUS        | Soda               | **3.500 DT** |
| MILK SHAKE | Milk Shake Vanille | **7.000 DT** |
| SMOOTHIE   | Smoothie Vanille   | **6.000 DT** |
| SMOOTHIE   | Smoothie Café      | **6.000 DT** |
| MOJITO     | Mojito             | **5.000 DT** |
| MOJITO     | Mojito Blue        | **6.000 DT** |
| MOJITO     | Mojito Red         | **6.000 DT** |
| GÂTEAUX    | Gâteaux chocolat   | **8.500 DT** |
| GÂTEAUX    | Gâteaux noisettes  | **8.500 DT** |
| GÂTEAUX    | Cheese Cake        | **8.500 DT** |

All of these are published.

## Published menu contract

| Category   | Items                                                                                   |  Count |
| ---------- | --------------------------------------------------------------------------------------- | -----: |
| CAFÉ       | Express, Cappucin, Direct, Américain, Spécial / Arôme, Lait au chocolat, Chocolat chaud |      7 |
| THÉ        | Thé, Thé infusion, Fruit sec au choix, Menthe                                           |      4 |
| EAU        | Eau 1,5 L, Eau 0,5 L, Bouteille en verre                                                |      3 |
| JUS        | Jus banane, Jus fraise, Jus d'orange, Citronnade, Soda                                  |      5 |
| MILK SHAKE | Milk Shake Vanille                                                                      |      1 |
| SMOOTHIE   | Smoothie Vanille, Smoothie Café                                                         |      2 |
| MOJITO     | Mojito, Mojito Blue, Mojito Red                                                         |      3 |
| GÂTEAUX    | Gâteaux chocolat, Gâteaux noisettes, Cheese Cake                                        |      3 |
| **Total**  |                                                                                         | **28** |

`publishedCategories()` filters on `status === 'confirmed' && visible`, then
drops a category with no publishable item. An empty price in the editor marks an
item pending, so a customer can never see `0.000 DT` or a placeholder.

## What the automated checks assert

`python3 qa/verify_content.py` runs at 390 px and 1440 px and asserts:

- exactly 8 sections and the 28 items above, in order, with exact names;
- three cake cards with three images and three `8.500 DT` prices rendered as
  text (not baked into the image);
- every price matches `N.NNN DT`;
- the coffee increase appears exactly once;
- no horizontal overflow and category navigation reaches `GÂTEAUX`;
- the owner editor starts at 28 items, writes a browser-local draft, keeps it
  across a reload, resets to 28, and refuses the ambiguous price `1 200`;
- the publish dialog says that no shared server exists;
- `#/admin/dashboard` redirects to `#/admin` without a session;
- no console errors, page errors or unexpected network writes.

Last local run: **36/36 passed**.

## Still needing a human check

The data and geometry are verified; taste is not. A human should still confirm:

- the logo crop is the intended artwork at the displayed sizes;
- each cake photograph is the product the café wants shown under that name;
- the visual order and spacing feel right on a real phone;
- the French copy matches the café's voice.
