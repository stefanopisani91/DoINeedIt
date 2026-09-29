import type { CategoryId } from '@/engine';

export interface Category {
  id: CategoryId;
  label: string;
  description: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { id: 'tech', label: 'Tecnologia', description: 'Telefoni, cuffie, PC, gadget', emoji: '🎧' },
  { id: 'home', label: 'Casa', description: 'Arredo, pulizia, giardino', emoji: '🛋️' },
  { id: 'kitchen', label: 'Cucina', description: 'Elettrodomestici e utensili', emoji: '🍳' },
  {
    id: 'clothing',
    label: 'Abbigliamento',
    description: 'Vestiti, scarpe, accessori',
    emoji: '👟',
  },
  {
    id: 'sport',
    label: 'Sport e hobby',
    description: 'Attrezzatura, fai da te, giochi',
    emoji: '🏋️',
  },
  { id: 'media', label: 'Libri e media', description: 'Libri, videogiochi, film', emoji: '📚' },
  {
    id: 'health',
    label: 'Salute e bellezza',
    description: 'Cura personale, integratori',
    emoji: '🧴',
  },
  { id: 'other', label: 'Altro', description: 'Tutto il resto', emoji: '📦' },
];

export function categoryById(id: string): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]!;
}
