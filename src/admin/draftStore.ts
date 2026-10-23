import type { MenuCategory, MenuItem } from '../data/menu';
import { MENU } from '../data/menu';

/**
 * In-memory draft of the menu used by the admin prototype.
 *
 * Nothing is persisted: the state lives in React only and disappears on
 * reload. There is no database and no server call anywhere in this module.
 */

export interface DraftState {
  categories: MenuCategory[];
}

export type DraftAction =
  | { type: 'add-item'; categoryId: string; item: MenuItem }
  | {
      type: 'update-item';
      itemId: string;
      patch: Partial<Pick<MenuItem, 'name' | 'price' | 'status' | 'note' | 'visible'>>;
    }
  | { type: 'remove-item'; itemId: string }
  | { type: 'toggle-item'; itemId: string }
  | { type: 'move-item'; itemId: string; direction: 'up' | 'down' }
  | { type: 'move-category'; categoryId: string; direction: 'up' | 'down' }
  | { type: 'reset' };

export const initialDraft: DraftState = { categories: MENU };

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

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'add-item':
      return {
        categories: state.categories.map((category) =>
          category.id === action.categoryId
            ? { ...category, items: [...category.items, action.item] }
            : category,
        ),
      };

    case 'update-item':
      return {
        categories: mapItem(state.categories, action.itemId, (item) => ({
          ...item,
          ...action.patch,
        })),
      };

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

    case 'move-item': {
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
    }

    case 'move-category': {
      const index = state.categories.findIndex(
        (category) => category.id === action.categoryId,
      );
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

/** Builds a unique id for a new item ("express" -> "express-2"). */
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
