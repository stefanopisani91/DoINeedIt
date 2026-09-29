import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { Item } from '@/storage/types';
import { categoryById } from '@/data/categories';
import { useCopy } from '@/i18n';
import { coolingOff } from '@/insights/lifecycle';
import { formatDate, formatPrice, formatRelativeDate } from '@/lib/format';
import { highlightText } from '@/lib/library';
import { verdictStyle } from '../verdict';
import { Icon } from './Icon';
import { ProductImage } from './ProductImage';

interface ItemCardProps {
  item: Item;
  /** Search words to mark in the title. */
  highlight?: readonly string[];
  /** The reference time for the relative date and the cooling-off badge. */
  now?: Date;
}

const PILL = 'rounded-full px-2 py-0.5 text-xs font-medium';

export function ItemCard({ item, highlight = [], now = new Date() }: ItemCardProps) {
  const copy = useCopy();
  const style = verdictStyle(item.result.verdict, copy);
  const category = categoryById(item.category, copy);
  const cooling = coolingOff(item, now);
  const hasChips = item.decision !== undefined || cooling.state !== 'none' || item.note;
  return (
    <li>
      <Link
        to={`/items/${item.id}`}
        className={`flex items-center gap-3 rounded-card border-l-4 bg-surface p-3 shadow-card ring-1 ring-line transition-shadow hover:shadow-raised focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none sm:gap-4 ${style.border}`}
      >
        <ProductImage src={item.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-tile" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-semibold leading-snug">
            {highlightText(item.title, highlight).map((segment, index) =>
              segment.match ? (
                <mark
                  key={index}
                  className="rounded bg-accent-200/70 text-inherit dark:bg-accent-500/30"
                >
                  {segment.text}
                </mark>
              ) : (
                <Fragment key={index}>{segment.text}</Fragment>
              ),
            )}
          </h3>
          <p className="mt-1 truncate text-sm text-ink-faint">
            <span aria-hidden="true">{category.emoji} </span>
            {category.label}
            {item.price && (
              <> · {formatPrice(item.price.amount, item.price.currency, copy.locale)}</>
            )}
            {' · '}
            <time dateTime={item.updatedAt} title={formatDate(item.updatedAt, copy.locale)}>
              {formatRelativeDate(item.updatedAt, copy.locale, now)}
            </time>
          </p>
          {hasChips && (
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {item.decision && (
                <span className={`${PILL} bg-surface-sunken text-ink-muted`}>
                  {copy.decision[item.decision.outcome]}
                </span>
              )}
              {cooling.state === 'cooling' && (
                <span
                  className={`${PILL} bg-wait-100 text-wait-800 dark:bg-wait-900/40 dark:text-wait-300`}
                >
                  {copy.coolingOff.badge(cooling.daysLeft)}
                </span>
              )}
              {cooling.state === 'ready' && (
                <span
                  className={`${PILL} bg-wait-100 text-wait-800 dark:bg-wait-900/40 dark:text-wait-300`}
                >
                  {copy.coolingOff.ready}
                </span>
              )}
              {item.note && (
                <span className="inline-flex items-center text-ink-faint">
                  <Icon name="pencil" size={16} />
                  <span className="sr-only">{copy.home.card.hasNote}</span>
                </span>
              )}
            </p>
          )}
        </div>
        <div className={`shrink-0 rounded-tile px-3 py-2 text-center ${style.bg}`}>
          <div className={`text-xl font-bold tabular-nums ${style.text}`}>{item.result.score}%</div>
          <div className={`text-xs font-medium ${style.text}`}>{style.short}</div>
        </div>
      </Link>
    </li>
  );
}
