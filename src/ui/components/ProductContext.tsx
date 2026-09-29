import { categoryById } from '@/data/categories';
import { useCopy } from '@/i18n';
import { formatPrice } from '@/lib/format';
import type { Draft } from '@/storage/types';
import { ProductImage } from './ProductImage';
import { Surface } from './Surface';

/** The product being evaluated, kept in sight while the questions go by. */
export function ProductContext({ draft }: { draft: Draft }) {
  const copy = useCopy();
  const category = categoryById(draft.category, copy);
  return (
    <Surface as="aside" padding="sm" className="flex items-center gap-3">
      <ProductImage src={draft.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-tile" />
      <div className="min-w-0 flex-1">
        <p className="eyebrow">{copy.questionnaire.evaluating}</p>
        <p className="truncate text-sm font-semibold">{draft.title}</p>
        <p className="truncate text-xs text-ink-faint">
          <span aria-hidden="true">{category.emoji} </span>
          {category.label}
          {draft.price && (
            <> · {formatPrice(draft.price.amount, draft.price.currency, copy.locale)}</>
          )}
        </p>
      </div>
    </Surface>
  );
}
