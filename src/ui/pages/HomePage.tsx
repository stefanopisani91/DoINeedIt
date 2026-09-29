import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { exampleItems } from '@/data/examples';
import { useCopy } from '@/i18n';
import { parseLink } from '@/lib/amazon-url';
import { formatPrice } from '@/lib/format';
import { useQueueStore, type QueuedProduct } from '@/storage/queue';
import { useItemsStore } from '@/storage/store';
import { Button, ButtonLink } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ItemCard } from '../components/ItemCard';
import { ProductImage } from '../components/ProductImage';

export function HomePage() {
  const copy = useCopy();
  const navigate = useNavigate();
  const items = useItemsStore((state) => state.items);
  const merge = useItemsStore((state) => state.merge);
  const queue = useQueueStore((state) => state.queue);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-10">
      <section className="rounded-3xl bg-brand-700 px-6 py-8 text-white shadow-lg sm:px-10 sm:py-12 dark:bg-brand-900">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.home.title}</h1>
        <p className="mt-3 max-w-xl text-brand-100">{copy.home.subtitle}</p>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="link" className="sr-only">
            {copy.home.title}
          </label>
          <input
            id="link"
            type="text"
            inputMode="url"
            autoComplete="off"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(null);
            }}
            placeholder={copy.home.placeholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'link-error' : undefined}
            className="min-h-14 flex-1 rounded-xl border-0 bg-white px-4 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <Button
            type="submit"
            size="lg"
            className="bg-amber-400 text-stone-950 hover:bg-amber-300 dark:bg-amber-400 dark:hover:bg-amber-300"
          >
            {copy.home.submit}
          </Button>
        </form>
        {error && (
          <p id="link-error" role="alert" className="mt-3 text-sm font-medium text-amber-200">
            {error}
          </p>
        )}
        <p className="mt-4 flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
          <Link to="/new" className="text-brand-100 underline underline-offset-4 hover:text-white">
            {copy.home.manualLink}
          </Link>
          <Link
            to="/wishlist"
            className="text-brand-100 underline underline-offset-4 hover:text-white"
          >
            {copy.home.wishlistLink}
          </Link>
        </p>
      </section>

      {queue.length > 0 && <QueueSection queue={queue} />}

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">{copy.home.listTitle}</h2>
          {items.length > 0 && (
            <span className="text-sm text-stone-500 dark:text-stone-400">
              {copy.home.count(items.length)}
            </span>
          )}
        </div>
        {items.length === 0 ? (
          <EmptyState
            title={copy.home.empty.title}
            body={copy.home.empty.body}
            action={
              <Button variant="secondary" onClick={() => merge(exampleItems(copy))}>
                {copy.home.empty.examples}
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </ul>
        )}
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
      <div className="mb-1 flex items-baseline justify-between">
        <h2 id="queue-title" className="text-xl font-bold">
          {copy.home.queue.title}
        </h2>
        <span className="text-sm text-stone-500 dark:text-stone-400">
          {copy.home.count(queue.length)}
        </span>
      </div>
      <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">{copy.home.queue.body}</p>
      <ul className="space-y-3">
        {queue.map((product) => (
          <li
            key={product.id}
            className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800"
          >
            <ProductImage src={product.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 basis-40">
              <h3 className="line-clamp-2 font-semibold leading-snug">{product.title}</h3>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {product.price &&
                  formatPrice(product.price.amount, product.price.currency, copy.locale)}
                {product.price && product.listTitle && ' · '}
                {product.listTitle && copy.home.queue.fromList(product.listTitle)}
              </p>
            </div>
            <div className="flex gap-2">
              <ButtonLink
                to={`/new?queue=${encodeURIComponent(product.id)}`}
                aria-label={`${copy.home.queue.evaluate}: ${product.title}`}
              >
                {copy.home.queue.evaluate}
              </ButtonLink>
              <Button
                variant="ghost"
                onClick={() => remove(product.id)}
                aria-label={`${copy.home.queue.discard}: ${product.title}`}
              >
                {copy.home.queue.discard}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
