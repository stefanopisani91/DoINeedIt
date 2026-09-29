import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { categoryById } from '@/data/categories';
import { exampleItems } from '@/data/examples';
import { useCopy } from '@/i18n';
import { parseLink } from '@/lib/amazon-url';
import { formatPrice } from '@/lib/format';
import { applyQuery, countByVerdict, isDefaultQuery, tokens } from '@/lib/library';
import { useQueueStore, type QueuedProduct } from '@/storage/queue';
import { useSettingsStore } from '@/storage/settings';
import { useItemsStore } from '@/storage/store';
import { Button, ButtonLink } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { ItemCard } from '../components/ItemCard';
import { LibrarySummary, LibraryToolbar } from '../components/Library';
import { ProductImage } from '../components/ProductImage';
import { Surface } from '../components/Surface';
import { WelcomePanel } from '../components/WelcomePanel';
import { useLibraryQuery } from '../hooks';

const HERO_CHIP =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-sm text-white transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:outline-none';

export function HomePage() {
  const copy = useCopy();
  const navigate = useNavigate();
  const items = useItemsStore((state) => state.items);
  const merge = useItemsStore((state) => state.merge);
  const queue = useQueueStore((state) => state.queue);
  const budget = useSettingsStore((state) => state.budget);
  const onboardingSeen = useSettingsStore((state) => state.onboardingSeen);
  const [query, patch, reset] = useLibraryQuery();
  // One reference time per visit: relative dates, badges and the summary agree with each other.
  const [now] = useState(() => new Date());
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const shown = useMemo(
    () => applyQuery(items, query, (id) => categoryById(id, copy).label),
    [items, query, copy],
  );
  const counts = useMemo(
    () =>
      countByVerdict(
        applyQuery(items, { ...query, verdict: 'all' }, (id) => categoryById(id, copy).label),
      ),
    [items, query, copy],
  );
  const highlight = useMemo(() => tokens(query.q), [query.q]);
  const compact = items.length > 0 || queue.length > 0;
  const filtering = items.length > 0 && !isDefaultQuery(query);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseLink(value);
    if (parsed.kind === 'invalid') {
      setError(copy.home.invalidLink);
      return;
    }
    if (parsed.kind === 'wishlist') {
      navigate(`/wishlist?url=${encodeURIComponent(parsed.canonicalUrl)}`);
      return;
    }
    navigate(`/new?url=${encodeURIComponent(parsed.url)}`);
  };

  return (
    <div className="space-y-8">
      <Surface
        tone="brand"
        padding="lg"
        className={`overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 dark:from-brand-900 dark:to-brand-950 ${
          compact ? 'py-6 sm:py-6' : ''
        }`}
      >
        <h1 className={compact ? 'text-2xl font-bold tracking-tight' : 'text-display font-bold'}>
          {copy.home.title}
        </h1>
        <p className={`mt-3 max-w-xl text-brand-100 ${compact ? 'hidden sm:block' : ''}`}>
          {copy.home.subtitle}
        </p>
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="link" className="sr-only">
            {copy.home.title}
          </label>
          <div className="relative flex-1">
            <input
              id="link"
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="off"
              enterKeyHint="go"
              spellCheck={false}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
              placeholder={copy.home.placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'link-error' : undefined}
              className={`min-h-14 w-full rounded-control border-0 bg-white px-4 text-base text-stone-950 placeholder:text-stone-400 focus:ring-2 focus:ring-accent-400 focus:outline-none ${
                value ? 'pr-14' : ''
              }`}
            />
            {value !== '' && (
              <Button
                iconOnly
                variant="ghost"
                leadingIcon="x"
                aria-label={copy.home.clearField}
                onClick={() => {
                  setValue('');
                  setError(null);
                }}
                className="absolute top-1/2 right-1.5 -translate-y-1/2 text-stone-950 hover:bg-stone-100! hover:text-stone-950"
              />
            )}
          </div>
          <Button type="submit" variant="accent" size="lg" trailingIcon="chevron-right">
            {copy.home.submit}
          </Button>
        </form>
        {error && (
          <p id="link-error" role="alert" className="mt-3 text-sm font-medium text-accent-200">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/new" className={HERO_CHIP}>
            <Icon name="pencil" size={16} />
            {copy.home.manualLink}
          </Link>
          <Link to="/wishlist" className={HERO_CHIP}>
            <Icon name="list" size={16} />
            {copy.home.wishlistLink}
          </Link>
        </div>
      </Surface>

      {!onboardingSeen && items.length === 0 && <WelcomePanel />}

      {queue.length > 0 && <QueueSection queue={queue} />}

      {items.length > 0 && <LibrarySummary items={items} now={now} budget={budget} />}

      <section aria-labelledby="library-title">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="library-title" className="text-xl font-bold">
            {copy.home.listTitle}
          </h2>
          {items.length > 0 && (
            <span className="text-sm text-ink-faint tabular-nums">
              {copy.home.count(items.length)}
            </span>
          )}
        </div>
        {items.length > 0 && <LibraryToolbar query={query} onChange={patch} counts={counts} />}
        <p
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted not-empty:mt-3"
        >
          {filtering && (
            <>
              <span>{copy.home.library.shown(shown.length, items.length)}</span>
              {shown.length > 0 && (
                <Button variant="ghost" size="sm" onClick={reset}>
                  {copy.home.library.reset}
                </Button>
              )}
            </>
          )}
        </p>
        <div className="mt-4">
          {items.length === 0 ? (
            <EmptyState
              icon="cart"
              title={copy.home.empty.title}
              body={copy.home.empty.body}
              action={
                <Button variant="secondary" onClick={() => merge(exampleItems(copy))}>
                  {copy.home.empty.examples}
                </Button>
              }
            />
          ) : shown.length === 0 ? (
            <div role="status">
              <EmptyState
                icon="search"
                title={copy.home.noResults.title}
                body={copy.home.noResults.body}
                action={
                  <Button variant="secondary" onClick={reset}>
                    {copy.home.library.reset}
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="space-y-3">
              {shown.map((item) => (
                <ItemCard key={item.id} item={item} highlight={highlight} now={now} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

/** Products picked from a wish list, each waiting for its own evaluation. */
function QueueSection({ queue }: { queue: QueuedProduct[] }) {
  const copy = useCopy();
  const remove = useQueueStore((state) => state.remove);
  return (
    <section aria-labelledby="queue-title">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 id="queue-title" className="text-xl font-bold">
          {copy.home.queue.title}
        </h2>
        <span className="text-sm text-ink-faint tabular-nums">{copy.home.count(queue.length)}</span>
      </div>
      <p className="mb-4 text-sm text-ink-muted">{copy.home.queue.body}</p>
      <ul className="space-y-2">
        {queue.map((product) => (
          <Surface
            as="li"
            key={product.id}
            padding="sm"
            className="flex flex-wrap items-center gap-3"
          >
            <ProductImage
              src={product.imageUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-control"
            />
            <div className="min-w-0 flex-1 basis-40">
              <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{product.title}</h3>
              <p className="mt-0.5 truncate text-xs text-ink-faint">
                {product.price &&
                  formatPrice(product.price.amount, product.price.currency, copy.locale)}
                {product.price && product.listTitle && ' · '}
                {product.listTitle && copy.home.queue.fromList(product.listTitle)}
              </p>
            </div>
            <div className="flex gap-1.5">
              <ButtonLink
                size="sm"
                trailingIcon="chevron-right"
                to={`/new?queue=${encodeURIComponent(product.id)}`}
                aria-label={`${copy.home.queue.evaluate}: ${product.title}`}
              >
                {copy.home.queue.evaluate}
              </ButtonLink>
              <Button
                size="sm"
                variant="ghost"
                leadingIcon="x"
                onClick={() => remove(product.id)}
                aria-label={`${copy.home.queue.discard}: ${product.title}`}
              >
                {copy.home.queue.discard}
              </Button>
            </div>
          </Surface>
        ))}
      </ul>
    </section>
  );
}
