import type { CategoryId } from '@/engine';
import type { Copy } from '@/i18n/it';
import { it } from '@/i18n/it';

export interface Category {
  id: CategoryId;
  label: string;
  description: string;
  emoji: string;
}

/** The categories in the order they are offered; their texts come from the copy. */
export const CATEGORY_EMOJI: Record<CategoryId, string> = {
  tech: '🎧',
  home: '🛋️',
  kitchen: '🍳',
  clothing: '👟',
  sport: '🏋️',
  media: '📚',
  health: '🧴',
  other: '📦',
};

export const CATEGORY_IDS = Object.keys(CATEGORY_EMOJI) as CategoryId[];

export function categoriesIn(copy: Copy): Category[] {
  return CATEGORY_IDS.map((id) => ({ id, emoji: CATEGORY_EMOJI[id], ...copy.categories[id] }));
}

export function categoryById(id: string, copy: Copy): Category {
  const categories = categoriesIn(copy);
  return categories.find((c) => c.id === id) ?? categories[categories.length - 1]!;
}

/** The categories in Italian, the app's first language. */
export const CATEGORIES: Category[] = categoriesIn(it);
