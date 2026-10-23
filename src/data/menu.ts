/**
 * MENU DATA — single source of truth for the whole application.
 *
 * The public menu, the admin prototype and the automated checks all read from
 * this file. Nothing about prices or item names is duplicated anywhere else.
 *
 * PRICE STORAGE
 * Prices are integers expressed in *millimes* (1 DT = 1000 millimes).
 * 3500 => 3.500 DT. Integer storage avoids floating-point drift and makes the
 * automated assertions exact.
 *
 * PROVENANCE
 * Every item records where its price comes from:
 *  - 'owner-update'    price supplied directly by the owner (takes priority)
 *  - 'coffee-increase' original board price + the owner's +1.000 DT coffee rise
 *  - 'board'           original board price, unchanged
 *
 * See MENU-VERIFICATION.md for the items still awaiting owner confirmation.
 */

export type PriceSource = 'owner-update' | 'coffee-increase' | 'board';

export type ItemStatus = 'confirmed' | 'pending';

export interface MenuItem {
  /** Stable identifier, used as a React key and as an anchor target. */
  id: string;
  /** Display name, exactly as written on the board or as given by the owner. */
  name: string;
  /** Price in millimes. `null` means the price is unresolved and must not be published. */
  price: number | null;
  /** 'confirmed' prices may be published; 'pending' prices are owner-review items. */
  status: ItemStatus;
  /** Owner-controlled visibility toggle (independent from the price status). */
  visible: boolean;
  /** Short qualifier printed next to the name (only when the board states one). */
  note?: string;
  /** Where the price comes from. */
  source: PriceSource;
  /** Price before the owner's change, when one was applied. */
  originalPrice?: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

/** The owner's coffee rise applied to the five regular coffees, once. */
export const COFFEE_INCREASE = 1000;

export const MENU: MenuCategory[] = [
  {
    id: 'cafes',
    name: 'Cafés',
    items: [
      {
        id: 'express',
        name: 'Express',
        price: 3500,
        status: 'confirmed',
        visible: true,
        source: 'coffee-increase',
        originalPrice: 2500,
      },
      {
        id: 'cappucin',
        name: 'Cappucin',
        price: 4000,
        status: 'confirmed',
        visible: true,
        source: 'coffee-increase',
        originalPrice: 3000,
      },
      {
        id: 'direct',
        name: 'Direct',
        price: 4500,
        status: 'confirmed',
        visible: true,
        source: 'coffee-increase',
        originalPrice: 3500,
      },
      {
        id: 'americain',
        name: 'Américain',
        price: 4000,
        status: 'confirmed',
        visible: true,
        source: 'coffee-increase',
        originalPrice: 3000,
      },
      {
        id: 'special-arome',
        name: 'Spécial / Arôme',
        price: 2000,
        status: 'confirmed',
        visible: true,
        source: 'coffee-increase',
        originalPrice: 1000,
      },
    ],
  },
  {
    id: 'chocolats',
    name: 'Chocolats',
    items: [
      {
        id: 'chocolat-chaud',
        name: 'Chocolat chaud',
        price: 6000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'chocolat-au-lait',
        name: 'Chocolat au lait',
        price: 3000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
    ],
  },
  {
    id: 'thes',
    name: 'Thés & Infusions',
    items: [
      {
        id: 'the-infusion',
        name: 'Thé infusion',
        price: 2500,
        status: 'confirmed',
        visible: true,
        source: 'board',
      },
      {
        id: 'menthe',
        name: 'Menthe',
        price: 1000,
        status: 'confirmed',
        visible: true,
        source: 'board',
      },
      {
        id: 'the-simple',
        name: 'Thé',
        price: null,
        status: 'pending',
        visible: true,
        source: 'board',
      },
    ],
  },
  {
    id: 'jus',
    name: 'Jus & Sodas',
    items: [
      {
        id: 'jus-orange',
        name: "Jus d'orange",
        price: 4000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'jus-banane',
        name: 'Jus de banane',
        price: 7000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'jus-fraise',
        name: 'Jus de fraise',
        price: 7000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'soda',
        name: 'Soda',
        price: 3500,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'citronnade',
        name: 'Citronnade',
        price: null,
        status: 'pending',
        visible: true,
        source: 'board',
      },
    ],
  },
  {
    id: 'smoothies',
    name: 'Smoothies & Milkshakes',
    items: [
      {
        id: 'milkshake-vanille',
        name: 'Milk-shake vanille',
        price: 7000,
        status: 'confirmed',
        visible: true,
        source: 'board',
      },
      {
        id: 'smoothie-vanille',
        name: 'Smoothie vanille',
        price: 6000,
        status: 'confirmed',
        visible: true,
        source: 'board',
      },
      {
        id: 'smoothie-cafe',
        name: 'Smoothie café',
        price: 6000,
        status: 'confirmed',
        visible: true,
        source: 'board',
      },
    ],
  },
  {
    id: 'cocktails',
    name: 'Cocktails',
    items: [
      {
        id: 'mojito',
        name: 'Mojito',
        price: 5000,
        status: 'confirmed',
        visible: true,
        source: 'board',
      },
      {
        id: 'mojito-blue',
        name: 'Mojito Blue',
        price: 6000,
        status: 'confirmed',
        visible: true,
        source: 'board',
      },
      {
        id: 'mojito-red',
        name: 'Mojito Red',
        price: 6000,
        status: 'confirmed',
        visible: true,
        source: 'board',
      },
    ],
  },
  {
    id: 'eaux',
    name: 'Eaux',
    items: [
      {
        id: 'eau-1-5',
        name: 'Eau 1,5 L',
        price: 2000,
        status: 'confirmed',
        visible: true,
        source: 'board',
      },
      {
        id: 'eau-0-5',
        name: 'Eau 0,5 L',
        price: 1200,
        status: 'confirmed',
        visible: true,
        source: 'board',
      },
      {
        id: 'bouteille-verre',
        name: 'Bouteille en verre',
        price: 2500,
        status: 'confirmed',
        visible: true,
        source: 'board',
      },
    ],
  },
  {
    id: 'douceurs',
    name: 'Douceurs',
    items: [
      {
        id: 'gateaux-noisettes',
        name: 'Gâteaux aux noisettes',
        price: 8500,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'fruit-sec',
        name: 'Fruit sec au choix',
        price: 2000,
        status: 'confirmed',
        visible: true,
        source: 'board',
      },
      {
        id: 'cheesecake',
        name: 'Cheesecake',
        price: null,
        status: 'pending',
        visible: true,
        source: 'board',
      },
    ],
  },
];

/**
 * The published menu: only confirmed, visible items are exposed to customers.
 * Pending prices are never rendered in the public menu — see
 * MENU-VERIFICATION.md.
 */
export function publishedCategories(categories: MenuCategory[] = MENU): MenuCategory[] {
  return categories
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => item.status === 'confirmed' && item.visible),
    }))
    .filter((category) => category.items.length > 0);
}

/** Flat list of every item, in menu order. */
export function allItems(categories: MenuCategory[] = MENU): MenuItem[] {
  return categories.flatMap((category) => category.items);
}
