/**
 * MENU DATA — the eight owner-approved default categories.
 *
 * This is the *initial* menu. Once the owner edits it in the admin, the draft
 * is stored in the browser (see `menuStorage.ts`); the defaults below are the
 * fallback and the target of "Réinitialiser". They are not re-applied on every
 * startup, so a deleted default category stays deleted until a reset.
 *
 * PRICE STORAGE
 * Prices are integers expressed in *millimes* (1 DT = 1000 millimes).
 * 3500 => 3.500 DT. Integer storage avoids floating-point drift and makes the
 * automated assertions exact.
 *
 * PROVENANCE
 * Every item records where its price comes from:
 *  - 'owner-update'    price supplied directly by the owner
 *  - 'coffee-increase' original board price + the owner's +1.000 DT coffee rise
 *  - 'board'           original board price, unchanged
 *
 * The 2026 owner list is final: every item below is confirmed and published.
 * The coffee rise is already included in the stored price and must never be
 * applied a second time.
 */

export type PriceSource = 'owner-update' | 'coffee-increase' | 'board';

export type ItemStatus = 'confirmed' | 'pending';

export interface MenuItem {
  /** Stable identifier, used as a React key. */
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
  /** Stable identifier, never derived from the display name at render time. */
  id: string;
  /** Display name, stored exactly as the owner wants it shown. */
  name: string;
  items: MenuItem[];
  /**
   * True for the eight owner-approved categories. They remain fully editable
   * and deletable, but deletion asks for an extra typed confirmation.
   */
  isDefault?: boolean;
}

/** The owner's coffee rise applied to the five regular coffees, once. */
export const COFFEE_INCREASE = 1000;

export const MENU: MenuCategory[] = [
  {
    id: 'cafe',
    name: 'CAFÉ',
    isDefault: true,
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
      {
        id: 'lait-au-chocolat',
        name: 'Lait au chocolat',
        price: 3000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'chocolat-chaud',
        name: 'Chocolat chaud',
        price: 6000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
    ],
  },
  {
    id: 'the',
    name: 'THÉ',
    isDefault: true,
    items: [
      {
        id: 'the-simple',
        name: 'Thé',
        price: 3000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'the-infusion',
        name: 'Thé infusion',
        price: 2500,
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
        source: 'owner-update',
      },
      {
        id: 'menthe',
        name: 'Menthe',
        price: 1000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
    ],
  },
  {
    id: 'eau',
    name: 'EAU',
    isDefault: true,
    items: [
      {
        id: 'eau-1-5',
        name: 'Eau 1,5 L',
        price: 2000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'eau-0-5',
        name: 'Eau 0,5 L',
        price: 1200,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'bouteille-verre',
        name: 'Bouteille en verre',
        price: 2500,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
    ],
  },
  {
    id: 'jus',
    name: 'JUS',
    isDefault: true,
    items: [
      {
        id: 'jus-banane',
        name: 'Jus banane',
        price: 7000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'jus-fraise',
        name: 'Jus fraise',
        price: 7000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'jus-orange',
        name: "Jus d'orange",
        price: 4000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'citronnade',
        name: 'Citronnade',
        price: 6000,
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
    ],
  },
  {
    id: 'milk-shake',
    name: 'MILK SHAKE',
    isDefault: true,
    items: [
      {
        id: 'milkshake-vanille',
        name: 'Milk Shake Vanille',
        price: 7000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
    ],
  },
  {
    id: 'smoothie',
    name: 'SMOOTHIE',
    isDefault: true,
    items: [
      {
        id: 'smoothie-vanille',
        name: 'Smoothie Vanille',
        price: 6000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'smoothie-cafe',
        name: 'Smoothie Café',
        price: 6000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
    ],
  },
  {
    id: 'mojito',
    name: 'MOJITO',
    isDefault: true,
    items: [
      {
        id: 'mojito',
        name: 'Mojito',
        price: 5000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'mojito-blue',
        name: 'Mojito Blue',
        price: 6000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'mojito-red',
        name: 'Mojito Red',
        price: 6000,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
    ],
  },
  {
    id: 'gateaux',
    name: 'GÂTEAUX',
    isDefault: true,
    items: [
      {
        id: 'gateaux-chocolat',
        name: 'Gâteaux chocolat',
        price: 8500,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'gateaux-noisettes',
        name: 'Gâteaux noisettes',
        price: 8500,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
      {
        id: 'cheesecake',
        name: 'Cheese Cake',
        price: 8500,
        status: 'confirmed',
        visible: true,
        source: 'owner-update',
      },
    ],
  },
];

/**
 * The published menu: only confirmed, visible items are exposed to customers.
 * Pending prices are never rendered in the public menu, and a category that
 * ends up with no publishable item is dropped from the navigation.
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
