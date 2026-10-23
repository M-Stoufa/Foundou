/**
 * Data validation for the published menu.
 *
 * The expectations below are written out by hand from the owner's brief and
 * the original board — deliberately NOT derived from `src/data/menu.ts`, so
 * that a wrong value in the data file fails the test instead of quietly
 * redefining the truth.
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
 * The full expected menu, item by item.
 * `boardPrice` is the original board value; `price` is what a customer sees.
 */
const EXPECTED: ExpectedItem[] = [
  // --- Cafés: the owner's +1.000 DT rise, applied exactly once ------------
  { id: 'express', name: 'Express', category: 'Cafés', price: 3500, source: 'coffee-increase', boardPrice: 2500 },
  { id: 'cappucin', name: 'Cappucin', category: 'Cafés', price: 4000, source: 'coffee-increase', boardPrice: 3000 },
  { id: 'direct', name: 'Direct', category: 'Cafés', price: 4500, source: 'coffee-increase', boardPrice: 3500 },
  { id: 'americain', name: 'Américain', category: 'Cafés', price: 4000, source: 'coffee-increase', boardPrice: 3000 },
  { id: 'special-arome', name: 'Spécial / Arôme', category: 'Cafés', price: 2000, source: 'coffee-increase', boardPrice: 1000 },

  // --- Chocolats: owner-supplied prices ----------------------------------
  { id: 'chocolat-chaud', name: 'Chocolat chaud', category: 'Chocolats', price: 6000, source: 'owner-update', boardPrice: null },
  { id: 'chocolat-au-lait', name: 'Chocolat au lait', category: 'Chocolats', price: 3000, source: 'owner-update', boardPrice: null },

  // --- Thés & Infusions: board prices, one price still unresolved ---------
  { id: 'the-infusion', name: 'Thé infusion', category: 'Thés & Infusions', price: 2500, source: 'board', boardPrice: 2500 },
  { id: 'menthe', name: 'Menthe', category: 'Thés & Infusions', price: 1000, source: 'board', boardPrice: 1000 },
  { id: 'the-simple', name: 'Thé', category: 'Thés & Infusions', price: null, source: 'board', boardPrice: null },

  // --- Jus & Sodas -------------------------------------------------------
  { id: 'jus-orange', name: "Jus d'orange", category: 'Jus & Sodas', price: 4000, source: 'owner-update', boardPrice: null },
  { id: 'jus-banane', name: 'Jus de banane', category: 'Jus & Sodas', price: 7000, source: 'owner-update', boardPrice: null },
  { id: 'jus-fraise', name: 'Jus de fraise', category: 'Jus & Sodas', price: 7000, source: 'owner-update', boardPrice: null },
  { id: 'soda', name: 'Soda', category: 'Jus & Sodas', price: 3500, source: 'owner-update', boardPrice: null },
  { id: 'citronnade', name: 'Citronnade', category: 'Jus & Sodas', price: null, source: 'board', boardPrice: null },

  // --- Smoothies & Milkshakes --------------------------------------------
  { id: 'milkshake-vanille', name: 'Milk-shake vanille', category: 'Smoothies & Milkshakes', price: 7000, source: 'board', boardPrice: 7000 },
  { id: 'smoothie-vanille', name: 'Smoothie vanille', category: 'Smoothies & Milkshakes', price: 6000, source: 'board', boardPrice: 6000 },
  { id: 'smoothie-cafe', name: 'Smoothie café', category: 'Smoothies & Milkshakes', price: 6000, source: 'board', boardPrice: 6000 },

  // --- Cocktails ---------------------------------------------------------
  { id: 'mojito', name: 'Mojito', category: 'Cocktails', price: 5000, source: 'board', boardPrice: 5000 },
  { id: 'mojito-blue', name: 'Mojito Blue', category: 'Cocktails', price: 6000, source: 'board', boardPrice: 6000 },
  { id: 'mojito-red', name: 'Mojito Red', category: 'Cocktails', price: 6000, source: 'board', boardPrice: 6000 },

  // --- Eaux --------------------------------------------------------------
  { id: 'eau-1-5', name: 'Eau 1,5 L', category: 'Eaux', price: 2000, source: 'board', boardPrice: 2000 },
  { id: 'eau-0-5', name: 'Eau 0,5 L', category: 'Eaux', price: 1200, source: 'board', boardPrice: 1200 },
  { id: 'bouteille-verre', name: 'Bouteille en verre', category: 'Eaux', price: 2500, source: 'board', boardPrice: 2500 },

  // --- Douceurs ----------------------------------------------------------
  { id: 'gateaux-noisettes', name: 'Gâteaux aux noisettes', category: 'Douceurs', price: 8500, source: 'owner-update', boardPrice: null },
  { id: 'fruit-sec', name: 'Fruit sec au choix', category: 'Douceurs', price: 2000, source: 'board', boardPrice: 2000 },
  { id: 'cheesecake', name: 'Cheesecake', category: 'Douceurs', price: null, source: 'board', boardPrice: null },
];

describe('menu data', () => {
  it('contains exactly the expected items', () => {
    expect(allItems()).toHaveLength(EXPECTED.length);
    expect(allItems().length).toBe(27);
  });

  it('exposes 8 categories in board order', () => {
    expect(MENU.map((category) => category.name)).toEqual([
      'Cafés',
      'Chocolats',
      'Thés & Infusions',
      'Jus & Sodas',
      'Smoothies & Milkshakes',
      'Cocktails',
      'Eaux',
      'Douceurs',
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

  it('classifies every item into exactly one of the three provenance buckets', () => {
    const counts = allItems().reduce<Record<PriceSource, number>>(
      (acc, item) => ({ ...acc, [item.source]: (acc[item.source] ?? 0) + 1 }),
      { 'owner-update': 0, 'coffee-increase': 0, board: 0 },
    );
    expect(counts).toEqual({ 'owner-update': 7, 'coffee-increase': 5, board: 15 });
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
  it('leaves every priced board item at its printed price', () => {
    const boardItems = allItems().filter(
      (item) => item.source === 'board' && item.price !== null,
    );
    const expectedById = new Map(EXPECTED.map((item) => [item.id, item]));

    expect(boardItems.length).toBeGreaterThan(0);
    for (const item of boardItems) {
      const expected = expectedById.get(item.id);
      expect(expected?.boardPrice, `board price of ${item.id}`).toBeTypeOf('number');
      expect(item.price, `price of ${item.id}`).toBe(expected?.boardPrice);
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

  it('never leaks the coffee rise into tea, water, milkshakes or mojitos', () => {
    const byId = new Map(allItems().map((item) => [item.id, item]));

    // Board prices, verbatim, with no +1.000 anywhere near them.
    expect(byId.get('the-infusion')?.price).toBe(2500);
    expect(byId.get('menthe')?.price).toBe(1000);
    expect(byId.get('eau-1-5')?.price).toBe(2000);
    expect(byId.get('eau-0-5')?.price).toBe(1200);
    expect(byId.get('bouteille-verre')?.price).toBe(2500);
    expect(byId.get('milkshake-vanille')?.price).toBe(7000);
    expect(byId.get('smoothie-vanille')?.price).toBe(6000);
    expect(byId.get('smoothie-cafe')?.price).toBe(6000);
    expect(byId.get('mojito')?.price).toBe(5000);
    expect(byId.get('mojito-blue')?.price).toBe(6000);
    expect(byId.get('mojito-red')?.price).toBe(6000);
    expect(byId.get('fruit-sec')?.price).toBe(2000);
  });

  it('keeps the owner-supplied chocolate, juice, soda and cake prices exact', () => {
    const byId = new Map(allItems().map((item) => [item.id, item]));

    expect(byId.get('chocolat-chaud')?.price).toBe(6000);
    expect(byId.get('chocolat-au-lait')?.price).toBe(3000);
    expect(byId.get('gateaux-noisettes')?.price).toBe(8500);
    expect(byId.get('soda')?.price).toBe(3500);
    expect(byId.get('jus-orange')?.price).toBe(4000);
    expect(byId.get('jus-banane')?.price).toBe(7000);
    expect(byId.get('jus-fraise')?.price).toBe(7000);
  });

  it('keeps owner-updated prices without an original-price field', () => {
    const ownerItems = allItems().filter((item) => item.source === 'owner-update');
    expect(ownerItems.length).toBeGreaterThan(0);
    for (const item of ownerItems) {
      expect(item.originalPrice).toBeUndefined();
    }
  });
});

describe('publishedCategories', () => {
  it('excludes every item whose price is not confirmed', () => {
    const published = publishedCategories().flatMap((category) => category.items);
    const publishedIds = published.map((item) => item.id);

    expect(publishedIds).not.toContain('the-simple'); // Thé — price masked
    expect(publishedIds).not.toContain('citronnade'); // Citronnade — unclear
    expect(publishedIds).not.toContain('cheesecake'); // Cheesecake — unconfirmed
  });

  it('excludes hidden items', () => {
    const hidden = allItems().filter((item) => !item.visible).map((item) => item.id);
    const publishedIds = publishedCategories().flatMap((c) => c.items.map((i) => i.id));
    for (const id of hidden) {
      expect(publishedIds).not.toContain(id);
    }
  });

  it('never publishes a null price', () => {
    for (const item of publishedCategories().flatMap((category) => category.items)) {
      expect(item.price).not.toBeNull();
      expect(item.status).toBe('confirmed');
    }
  });

  it('publishes 24 items across the 8 categories', () => {
    const published = publishedCategories();
    expect(published).toHaveLength(8);
    expect(published.flatMap((category) => category.items)).toHaveLength(24);
  });

  it('drops a category that ends up with nothing to show', () => {
    const emptied = publishedCategories([
      { id: 'vide', name: 'Vide', items: [] },
    ]);
    expect(emptied).toHaveLength(0);
  });
});
