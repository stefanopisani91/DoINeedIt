import { Link } from 'react-router-dom';
import type { Item } from '@/storage/types';
import { categoryById } from '@/data/categories';
import { useCopy } from '@/i18n';
import { formatDate, formatPrice } from '@/lib/format';
import { verdictStyle } from '../verdict';
import { ProductImage } from './ProductImage';

export function ItemCard({ item }: { item: Item }) {
  const copy = useCopy();
  const style = verdictStyle(item.result.verdict, copy);
  const category = categoryById(item.category, copy);
  return (
    <li>
      <Link
        to={`/items/${item.id}`}
        className="flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-stone-200 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-stone-900 dark:ring-stone-800"
      >
        <ProductImage src={item.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-semibold leading-snug">{item.title}</h3>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            <span aria-hidden="true">{category.emoji} </span>
            {category.label}
            {item.price && (
              <> · {formatPrice(item.price.amount, item.price.currency, copy.locale)}</>
            )}
            <span className="hidden sm:inline"> · {formatDate(item.updatedAt, copy.locale)}</span>
          </p>
        </div>
        <div className={`shrink-0 rounded-xl px-3 py-2 text-center ${style.bg}`}>
          <div className={`text-xl font-bold tabular-nums ${style.text}`}>{item.result.score}%</div>
          <div className={`text-xs font-medium ${style.text}`}>{style.short}</div>
        </div>
      </Link>
    </li>
  );
}
