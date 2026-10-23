/**
 * Data validation for the published menu.
 *
 * Prices are in millimes (1 DT = 1000 millimes).
 */
import { describe, expect, it } from 'vitest';
import {
  COFFEE_INCREASE,
  MENU,
  allItems,
  publishedCategories,
  type PriceSource,
} from './menu';

interface ExpectedItem {
  id: string;
  name: string;
  category: string;
  /** Final published price, or null when the owner still has to confirm it. */
  price: number | null;
  source: PriceSource;
  /** Price printed on the original board, before any owner change. */
  boardPrice: number | null;
}

/**
 * The full expected menu, item by item (owner-approved 2026 list).
 * `boardPrice` is the original board value; `price` is what a customer sees.
 */
const EXPECTED: ExpectedItem[] = [
  // --- CAFÉ ----------------------------------------------------------------
  { id: 'express', name: 'Express', category: 'CAFÉ', price: 3500, source: 'coffee-increase', boardPrice: 2500 },
  { id: 'cappucin', name: 'Cappucin', category: 'CAFÉ', price: 4000, source: 'coffee-increase', boardPrice: 3000 },
  { id: 'direct', name: 'Direct', category: 'CAFÉ', price: 4500, source: 'coffee-increase', boardPrice: 3500 },
  { id: 'americain', name: 'Américain', category: 'CAFÉ', price: 4000, source: 'coffee-increase', boardPrice: 3000 },
  { id: 'special-arome', name: 'Spécial / Arôme', category: 'CAFÉ', price: 2000, source: 'coffee-increase', boardPrice: 1000 },
  { id: 'lait-au-chocolat', name: 'Lait au chocolat', category: 'CAFÉ', price: 3000, source: 'owner-update', boardPrice: null },
  { id: 'chocolat-chaud', name: 'Chocolat chaud', category: 'CAFÉ', price: 6000, source: 'owner-update', boardPrice: null },

  // --- THÉ -----------------------------------------------------------------
  { id: 'the-simple', name: 'Thé', category: 'THÉ', price: 3000, source: 'owner-update', boardPrice: null },
  { id: 'the-infusion', name: 'Thé infusion', category: 'THÉ', price: 2500, source: 'owner-update', boardPrice: null },
  { id: 'fruit-sec', name: 'Fruit sec au choix', category: 'THÉ', price: 2000, source: 'owner-update', boardPrice: null },
  { id: 'menthe', name: 'Menthe', category: 'THÉ', price: 1000, source: 'owner-update', boardPrice: null },

  // --- EAU -----------------------------------------------------------------
  { id: 'eau-1-5', name: 'Eau 1,5 L', category: 'EAU', price: 2000, source: 'owner-update', boardPrice: null },
  { id: 'eau-0-5', name: 'Eau 0,5 L', category: 'EAU', price: 1200, source: 'owner-update', boardPrice: null },
  { id: 'bouteille-verre', name: 'Bouteille en verre', category: 'EAU', price: 2500, source: 'owner-update', boardPrice: null },

  // --- JUS -----------------------------------------------------------------
  { id: 'jus-banane', name: 'Jus banane', category: 'JUS', price: 7000, source: 'owner-update', boardPrice: null },
  { id: 'jus-fraise', name: 'Jus fraise', category: 'JUS', price: 7000, source: 'owner-update', boardPrice: null },
  { id: 'jus-orange', name: "Jus d'orange", category: 'JUS', price: 4000, source: 'owner-update', boardPrice: null },
  { id: 'citronnade', name: 'Citronnade', category: 'JUS', price: 6000, source: 'owner-update', boardPrice: null },
  { id: 'soda', name: 'Soda', category: 'JUS', price: 3500, source: 'owner-update', boardPrice: null },

  // --- MILK SHAKE ----------------------------------------------------------
  { id: 'milkshake-vanille', name: 'Milk Shake Vanille', category: 'MILK SHAKE', price: 7000, source: 'owner-update', boardPrice: null },

  // --- SMOOTHIE ------------------------------------------------------------
  { id: 'smoothie-vanille', name: 'Smoothie Vanille', category: 'SMOOTHIE', price: 6000, source: 'owner-update', boardPrice: null },
  { id: 'smoothie-cafe', name: 'Smoothie Café', category: 'SMOOTHIE', price: 6000, source: 'owner-update', boardPrice: null },

  // --- MOJITO --------------------------------------------------------------
  { id: 'mojito', name: 'Mojito', category: 'MOJITO', price: 5000, source: 'owner-update', boardPrice: null },
  { id: 'mojito-blue', name: 'Mojito Blue', category: 'MOJITO', price: 6000, source: 'owner-update', boardPrice: null },
  { id: 'mojito-red', name: 'Mojito Red', category: 'MOJITO', price: 6000, source: 'owner-update', boardPrice: null },

  // --- GÂTEAUX -------------------------------------------------------------
  { id: 'gateaux-chocolat', name: 'Gâteaux chocolat', category: 'GÂTEAUX', price: 8500, source: 'owner-update', boardPrice: null },
  { id: 'gateaux-noisettes', name: 'Gâteaux noisettes', category: 'GÂTEAUX', price: 8500, source: 'owner-update', boardPrice: null },
  { id: 'cheesecake', name: 'Cheese Cake', category: 'GÂTEAUX', price: 8500, source: 'owner-update', boardPrice: null },
];

describe('menu data', () => {
  it('contains exactly the expected items', () => {
    expect(allItems()).toHaveLength(EXPECTED.length);
    expect(allItems().length).toBe(28);
  });

  it('exposes the eight owner-approved categories in the correct order', () => {
    expect(MENU.map((category) => category.name)).toEqual([
      'CAFÉ',
      'THÉ',
      'EAU',
      'JUS',
      'MILK SHAKE',
      'SMOOTHIE',
      'MOJITO',
      'GÂTEAUX',
    ]);
  });

  it('has no separate Chocolat category', () => {
    expect(MENU.map((category) => category.name)).not.toContain('Chocolat');
    expect(MENU.map((category) => category.name)).not.toContain('Chocolats');
  });

  it('places chocolate drinks under CAFÉ', () => {
    const cafe = MENU.find((category) => category.name === 'CAFÉ');
    expect(cafe?.items.map((item) => item.name)).toEqual([
      'Express',
      'Cappucin',
      'Direct',
      'Américain',
      'Spécial / Arôme',
      'Lait au chocolat',
      'Chocolat chaud',
    ]);
  });

  it('matches the expected item set exactly (no missing, no extra)', () => {
    const actual = allItems().map((item) => ({
      id: item.id,
      name: item.name,
      category: MENU.find((c) => c.items.includes(item))?.name,
    }));
    const expected = EXPECTED.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
    }));
    expect(actual).toEqual(expected);
  });

  it('has no duplicate ids', () => {
    const ids = allItems().map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has no duplicate item names', () => {
    const names = allItems().map((item) => item.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has no duplicate category ids', () => {
    const ids = MENU.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('prices every item exactly as expected', () => {
    const byId = new Map(allItems().map((item) => [item.id, item]));
    for (const expected of EXPECTED) {
      const item = byId.get(expected.id);
      expect(item, `missing item ${expected.id}`).toBeDefined();
      expect(item?.price, `price of ${expected.id}`).toBe(expected.price);
      expect(item?.source, `source of ${expected.id}`).toBe(expected.source);
    }
  });

  it('sets Thé at 3.000 DT and Citronnade at 6.000 DT', () => {
    const byId = new Map(allItems().map((item) => [item.id, item]));
    expect(byId.get('the-simple')?.price).toBe(3000);
    expect(byId.get('citronnade')?.price).toBe(6000);
  });

  it('every cake costs 8.500 DT', () => {
    const gateaux = MENU.find((category) => category.name === 'GÂTEAUX');
    expect(gateaux?.items.map((item) => item.name)).toEqual([
      'Gâteaux chocolat',
      'Gâteaux noisettes',
      'Cheese Cake',
    ]);
    for (const item of gateaux?.items ?? []) {
      expect(item.price).toBe(8500);
    }
  });
});

describe('coffee increase', () => {
  const coffees = allItems().filter((item) => item.source === 'coffee-increase');

  it('applies to exactly the five regular coffees', () => {
    expect(coffees.map((item) => item.id)).toEqual([
      'express',
      'cappucin',
      'direct',
      'americain',
      'special-arome',
    ]);
  });

  it('adds exactly +1.000 DT to the board price, once', () => {
    for (const coffee of coffees) {
      expect(coffee.originalPrice, `original price of ${coffee.id}`).toBeTypeOf('number');
      expect(coffee.price).toBe((coffee.originalPrice as number) + COFFEE_INCREASE);
    }
  });

  it('never applies the increase twice', () => {
    for (const coffee of coffees) {
      const base = coffee.originalPrice as number;
      expect(coffee.price).not.toBe(base + COFFEE_INCREASE * 2);
      expect(coffee.price).not.toBe(base + COFFEE_INCREASE + COFFEE_INCREASE);
    }
  });

  it('uses 1.000 DT as the rise', () => {
    expect(COFFEE_INCREASE).toBe(1000);
  });
});

describe('board prices are untouched', () => {
  it('keeps the owner-supplied prices exact', () => {
    const byId = new Map(allItems().map((item) => [item.id, item]));

    expect(byId.get('chocolat-chaud')?.price).toBe(6000);
    expect(byId.get('lait-au-chocolat')?.price).toBe(3000);
    expect(byId.get('gateaux-noisettes')?.price).toBe(8500);
    expect(byId.get('gateaux-chocolat')?.price).toBe(8500);
    expect(byId.get('cheesecake')?.price).toBe(8500);
    expect(byId.get('soda')?.price).toBe(3500);
    expect(byId.get('jus-orange')?.price).toBe(4000);
    expect(byId.get('jus-banane')?.price).toBe(7000);
    expect(byId.get('jus-fraise')?.price).toBe(7000);
    expect(byId.get('citronnade')?.price).toBe(6000);
    expect(byId.get('the-simple')?.price).toBe(3000);
    expect(byId.get('milkshake-vanille')?.price).toBe(7000);
    expect(byId.get('mojito')?.price).toBe(5000);
    expect(byId.get('mojito-blue')?.price).toBe(6000);
    expect(byId.get('mojito-red')?.price).toBe(6000);
  });

  it('keeps owner-updated prices without an original-price field', () => {
    const ownerItems = allItems().filter((item) => item.source === 'owner-update');
    expect(ownerItems.length).toBeGreaterThan(0);
    for (const item of ownerItems) {
      expect(item.originalPrice).toBeUndefined();
    }
  });

  it('attaches an original price to the five coffees and to nothing else', () => {
    const withOriginal = allItems()
      .filter((item) => item.originalPrice !== undefined)
      .map((item) => item.id);

    expect(withOriginal).toEqual([
      'express',
      'cappucin',
      'direct',
      'americain',
      'special-arome',
    ]);
  });
});

describe('publishedCategories', () => {
  it('never publishes a null price', () => {
    for (const item of publishedCategories().flatMap((category) => category.items)) {
      expect(item.price).not.toBeNull();
      expect(item.status).toBe('confirmed');
    }
  });

  it('publishes all 28 items across the 8 categories', () => {
    const published = publishedCategories();
    expect(published).toHaveLength(8);
    expect(published.map((category) => category.name)).toEqual([
      'CAFÉ',
      'THÉ',
      'EAU',
      'JUS',
      'MILK SHAKE',
      'SMOOTHIE',
      'MOJITO',
      'GÂTEAUX',
    ]);
    expect(published.flatMap((category) => category.items)).toHaveLength(28);
  });

  it('drops a category that ends up with nothing to show', () => {
    const emptied = publishedCategories([
      { id: 'vide', name: 'VIDE', items: [] },
    ]);
    expect(emptied).toHaveLength(0);
  });
});
