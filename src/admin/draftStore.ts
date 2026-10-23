import type { MenuCategory, MenuItem } from '../data/menu';
import { MENU } from '../data/menu';

/**
 * Draft operations for the admin prototype.
 *
 * The reducer is the single place where category/product integrity is
 * enforced: a product can never end up in a missing category, deleting a
 * non-empty category requires a valid reassignment target, and names/ids stay
 * unique. Persistence (browser-local only) lives in `../data/menuStorage.ts`.
 */

export interface DraftState {
  categories: MenuCategory[];
}

export type DraftAction =
  | { type: 'add-item'; categoryId: string; item: MenuItem }
  | {
      type: 'update-item';
      itemId: string;
      patch: Partial<Pick<MenuItem, 'name' | 'price' | 'status' | 'note' | 'visible'>> & {
        categoryId?: string;
      };
    }
  | { type: 'remove-item'; itemId: string }
  | { type: 'toggle-item'; itemId: string }
  | { type: 'move-item'; itemId: string; direction: 'up' | 'down' }
  | { type: 'move-item-to-category'; itemId: string; categoryId: string }
  | { type: 'add-category'; name: string }
  | { type: 'rename-category'; categoryId: string; name: string }
  | { type: 'delete-category'; categoryId: string; targetCategoryId?: string }
  | { type: 'move-category'; categoryId: string; direction: 'up' | 'down' }
  | { type: 'reset' };

export const initialDraft: DraftState = { categories: MENU };

export const MAX_CATEGORY_NAME = 40;

/** Trim the edges and collapse runs of whitespace (" JUS   frais " → "JUS frais"). */
export function normalizeCategoryName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function nameKey(name: string): string {
  return normalizeCategoryName(name).toLocaleLowerCase('fr');
}

export function categoryNameExists(
  categories: MenuCategory[],
  name: string,
  exceptCategoryId?: string,
): boolean {
  const key = nameKey(name);
  return categories.some(
    (category) => category.id !== exceptCategoryId && nameKey(category.name) === key,
  );
}

/** Builds a stable, readable id for a category ("Milk Shake" → "milk-shake-2"). */
export function uniqueCategoryId(categories: MenuCategory[], name: string): string {
  const base =
    normalizeCategoryName(name)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'categorie';
  const taken = new Set(categories.map((category) => category.id));
  if (!taken.has(base)) return base;
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}

/** Builds a unique id for a new item ("Express" → "express-2"). */
export function uniqueItemId(categories: MenuCategory[], name: string): string {
  const base =
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'article';
  const taken = new Set(categories.flatMap((category) => category.items.map((i) => i.id)));
  if (!taken.has(base)) return base;
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}

export function itemNameExists(
  categories: MenuCategory[],
  name: string,
  exceptItemId?: string,
): boolean {
  const key = nameKey(name);
  return categories.some((category) =>
    category.items.some((item) => item.id !== exceptItemId && nameKey(item.name) === key),
  );
}

function mapItem(
  categories: MenuCategory[],
  itemId: string,
  mapper: (item: MenuItem) => MenuItem,
): MenuCategory[] {
  return categories.map((category) => {
    if (!category.items.some((item) => item.id === itemId)) return category;
    return {
      ...category,
      items: category.items.map((item) => (item.id === itemId ? mapper(item) : item)),
    };
  });
}

export function findItem(
  categories: MenuCategory[],
  itemId: string,
): { item: MenuItem; categoryId: string } | null {
  for (const category of categories) {
    const item = category.items.find((candidate) => candidate.id === itemId);
    if (item) return { item, categoryId: category.id };
  }
  return null;
}

export function findCategory(
  categories: MenuCategory[],
  categoryId: string,
): MenuCategory | null {
  return categories.find((category) => category.id === categoryId) ?? null;
}

/** True when removing `categoryId` is structurally possible. */
export function canDeleteCategory(
  categories: MenuCategory[],
  categoryId: string,
): { allowed: boolean; reason?: string } {
  const category = findCategory(categories, categoryId);
  if (!category) return { allowed: false, reason: 'Catégorie introuvable.' };
  if (categories.length <= 1) {
    return { allowed: false, reason: 'La carte doit conserver au moins une catégorie.' };
  }
  return { allowed: true };
}

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'add-item': {
      const category = state.categories.find((entry) => entry.id === action.categoryId);
      if (!category) return state;
      const idTaken = state.categories.some((entry) =>
        entry.items.some((item) => item.id === action.item.id),
      );
      const name = normalizeCategoryName(action.item.name);
      if (idTaken || name === '' || itemNameExists(state.categories, name)) return state;
      return {
        categories: state.categories.map((entry) =>
          entry.id === action.categoryId
            ? { ...entry, items: [...entry.items, { ...action.item, name }] }
            : entry,
        ),
      };
    }

    case 'update-item': {
      const found = findItem(state.categories, action.itemId);
      if (!found) return state;

      const targetId = action.patch.categoryId ?? found.categoryId;
      const target = findCategory(state.categories, targetId);
      if (!target) return state;

      const patch = { ...action.patch };
      delete patch.categoryId;
      const name = patch.name === undefined ? found.item.name : normalizeCategoryName(patch.name);
      if (name === '' || itemNameExists(state.categories, name, action.itemId)) return state;

      const nextItem: MenuItem = { ...found.item, ...patch, name };

      if (targetId === found.categoryId) {
        return { categories: mapItem(state.categories, action.itemId, () => nextItem) };
      }

      return {
        categories: state.categories.map((category) => {
          if (category.id === found.categoryId) {
            return { ...category, items: category.items.filter((item) => item.id !== action.itemId) };
          }
          if (category.id === targetId) {
            return { ...category, items: [...category.items, nextItem] };
          }
          return category;
        }),
      };
    }

    case 'remove-item':
      return {
        categories: state.categories.map((category) => ({
          ...category,
          items: category.items.filter((item) => item.id !== action.itemId),
        })),
      };

    case 'toggle-item':
      return {
        categories: mapItem(state.categories, action.itemId, (item) => ({
          ...item,
          visible: !item.visible,
        })),
      };

    case 'move-item':
      return {
        categories: state.categories.map((category) => {
          const index = category.items.findIndex((item) => item.id === action.itemId);
          if (index === -1) return category;
          const target = action.direction === 'up' ? index - 1 : index + 1;
          if (target < 0 || target >= category.items.length) return category;
          const items = [...category.items];
          const [moved] = items.splice(index, 1);
          items.splice(target, 0, moved);
          return { ...category, items };
        }),
      };

    case 'move-item-to-category': {
      const found = findItem(state.categories, action.itemId);
      if (!found || !findCategory(state.categories, action.categoryId)) return state;
      if (found.categoryId === action.categoryId) return state;
      return {
        categories: state.categories.map((category) => {
          if (category.id === found.categoryId) {
            return { ...category, items: category.items.filter((item) => item.id !== action.itemId) };
          }
          if (category.id === action.categoryId) {
            return { ...category, items: [...category.items, found.item] };
          }
          return category;
        }),
      };
    }

    case 'add-category': {
      const name = normalizeCategoryName(action.name);
      if (name === '' || name.length > MAX_CATEGORY_NAME) return state;
      if (categoryNameExists(state.categories, name)) return state;
      const category: MenuCategory = {
        id: uniqueCategoryId(state.categories, name),
        name,
        items: [],
      };
      return { categories: [...state.categories, category] };
    }

    case 'rename-category': {
      const category = findCategory(state.categories, action.categoryId);
      const name = normalizeCategoryName(action.name);
      if (!category || name === '' || name.length > MAX_CATEGORY_NAME) return state;
      if (categoryNameExists(state.categories, name, action.categoryId)) return state;
      return {
        categories: state.categories.map((entry) =>
          entry.id === action.categoryId ? { ...entry, name } : entry,
        ),
      };
    }

    case 'delete-category': {
      const category = findCategory(state.categories, action.categoryId);
      if (!category) return state;
      if (state.categories.length <= 1) return state;

      if (category.items.length === 0) {
        return { categories: state.categories.filter((entry) => entry.id !== category.id) };
      }

      const target = action.targetCategoryId
        ? findCategory(state.categories, action.targetCategoryId)
        : null;
      if (!target || target.id === category.id) return state;

      return {
        categories: state.categories
          .filter((entry) => entry.id !== category.id)
          .map((entry) =>
            entry.id === target.id
              ? { ...entry, items: [...entry.items, ...category.items] }
              : entry,
          ),
      };
    }

    case 'move-category': {
      const index = state.categories.findIndex((category) => category.id === action.categoryId);
      if (index === -1) return state;
      const target = action.direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= state.categories.length) return state;
      const categories = [...state.categories];
      const [moved] = categories.splice(index, 1);
      categories.splice(target, 0, moved);
      return { categories };
    }

    case 'reset':
      return { categories: MENU };

    default:
      return state;
  }
}
