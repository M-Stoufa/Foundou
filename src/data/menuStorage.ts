/**
 * Browser-local persistence for the menu draft.
 *
 * WHAT THIS IS
 *   A versioned snapshot in `localStorage`, on this browser profile only.
 * WHAT THIS IS NOT
 *   Shared data. Visitors on other devices, other browsers, private windows or
 *   a different origin never see it, and clearing site data removes it. The
 *   admin is still an unprotected prototype; see ADMIN-PROTOTYPE.md.
 *
 * The whole payload is validated before use. A partial or malformed snapshot
 * is rejected as a unit and the defaults are shown instead, so a corrupted
 * localStorage entry can never leave products pointing at a missing category.
 */

import { MENU, type ItemStatus, type MenuCategory, type MenuItem, type PriceSource } from './menu';

export const MENU_STORAGE_KEY = 'cafe-foundou.menu.v2';
export const MENU_STORAGE_VERSION = 2;

interface StoredPayload {
  version: number;
  savedAt: string;
  categories: MenuCategory[];
}

const SOURCES: PriceSource[] = ['owner-update', 'coffee-increase', 'board'];
const STATUSES: ItemStatus[] = ['confirmed', 'pending'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function readItem(
  raw: unknown,
  itemIds: Set<string>,
  itemNames: Set<string>,
): MenuItem | null {
  if (!isRecord(raw)) return null;

  const { id, name, price, status, visible, note, source, originalPrice } = raw;
  if (typeof id !== 'string' || id.trim() === '') return null;
  if (typeof name !== 'string' || name.trim() === '') return null;
  if (price !== null && (typeof price !== 'number' || !Number.isInteger(price) || price < 0)) {
    return null;
  }
  if (typeof status !== 'string' || !STATUSES.includes(status as ItemStatus)) return null;
  if (typeof visible !== 'boolean') return null;
  if (typeof source !== 'string' || !SOURCES.includes(source as PriceSource)) return null;
  if (note !== undefined && typeof note !== 'string') return null;
  if (
    originalPrice !== undefined &&
    (typeof originalPrice !== 'number' || !Number.isInteger(originalPrice) || originalPrice < 0)
  ) {
    return null;
  }

  const cleanId = id.trim();
  const cleanName = normalizeName(name);
  const nameKey = cleanName.toLocaleLowerCase('fr');
  if (itemIds.has(cleanId) || itemNames.has(nameKey)) return null;
  itemIds.add(cleanId);
  itemNames.add(nameKey);

  return {
    id: cleanId,
    name: cleanName,
    price,
    status: status as ItemStatus,
    visible,
    ...(note ? { note: note.trim() } : {}),
    source: source as PriceSource,
    ...(originalPrice !== undefined ? { originalPrice } : {}),
  };
}

function readCategory(
  raw: unknown,
  categoryIds: Set<string>,
  categoryNames: Set<string>,
  itemIds: Set<string>,
  itemNames: Set<string>,
): MenuCategory | null {
  if (!isRecord(raw)) return null;
  const { id, name, items, isDefault } = raw;

  if (typeof id !== 'string' || id.trim() === '') return null;
  if (typeof name !== 'string' || name.trim() === '') return null;
  if (isDefault !== undefined && typeof isDefault !== 'boolean') return null;
  if (!Array.isArray(items)) return null;

  const cleanId = id.trim();
  const cleanName = normalizeName(name);
  const nameKey = cleanName.toLocaleLowerCase('fr');
  if (categoryIds.has(cleanId) || categoryNames.has(nameKey)) return null;
  categoryIds.add(cleanId);
  categoryNames.add(nameKey);

  const cleanItems: MenuItem[] = [];
  for (const item of items) {
    const parsed = readItem(item, itemIds, itemNames);
    if (!parsed) return null;
    cleanItems.push(parsed);
  }

  return {
    id: cleanId,
    name: cleanName,
    items: cleanItems,
    ...(isDefault === true ? { isDefault: true } : {}),
  };
}

function readPayload(raw: string): MenuCategory[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (parsed.version !== MENU_STORAGE_VERSION) return null;
  if (!Array.isArray(parsed.categories)) return null;

  const categoryIds = new Set<string>();
  const categoryNames = new Set<string>();
  const itemIds = new Set<string>();
  const itemNames = new Set<string>();
  const categories: MenuCategory[] = [];
  for (const category of parsed.categories) {
    const clean = readCategory(category, categoryIds, categoryNames, itemIds, itemNames);
    if (!clean) return null;
    categories.push(clean);
  }
  return categories;
}

/** Returns the saved menu, or null when there is nothing valid to load. */
export function loadStoredMenu(): MenuCategory[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(MENU_STORAGE_KEY);
    if (!raw) return null;
    return readPayload(raw);
  } catch {
    // Storage can be disabled (private mode, policy). The app still works.
    return null;
  }
}

/** The menu to render: the local draft when valid, otherwise the defaults. */
export function currentMenu(): MenuCategory[] {
  return loadStoredMenu() ?? MENU;
}

/** Saves the draft. Returns false when storage is unavailable or full. */
export function saveStoredMenu(categories: MenuCategory[]): boolean {
  if (typeof window === 'undefined') return false;
  const payload: StoredPayload = {
    version: MENU_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    categories,
  };
  try {
    window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredMenu(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(MENU_STORAGE_KEY);
  } catch {
    // Nothing to do: storage is unavailable.
  }
}

interface CanonicalItem {
  id: string;
  name: string;
  price: number | null;
  status: ItemStatus;
  visible: boolean;
  note?: string;
  source: PriceSource;
  originalPrice?: number;
}

interface CanonicalCategory {
  id: string;
  name: string;
  isDefault: boolean;
  items: CanonicalItem[];
}

function canonical(categories: MenuCategory[]): string {
  const shape: CanonicalCategory[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    isDefault: category.isDefault === true,
    items: category.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      status: item.status,
      visible: item.visible,
      ...(item.note !== undefined ? { note: item.note } : {}),
      source: item.source,
      ...(item.originalPrice !== undefined ? { originalPrice: item.originalPrice } : {}),
    })),
  }));
  return JSON.stringify(shape);
}

/** True when the draft is byte-for-byte the default menu (order included). */
export function isDefaultMenu(categories: MenuCategory[]): boolean {
  return canonical(categories) === canonical(MENU);
}
