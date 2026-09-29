import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWishlist, type WishlistOutcome } from '@/api/wishlist';
import { useCopy } from '@/i18n';
import { parseLink } from '@/lib/amazon-url';
import { formatPrice } from '@/lib/format';
import { queueKey, useQueueStore, type QueueInput } from '@/storage/queue';
import { useItemsStore } from '@/storage/store';
import type { WishlistItem } from '../../../netlify/lib/wishlist-parser';
import { Button, ButtonLink } from '../components/Button';
import { Notice } from '../components/Notice';
import { ProductImage } from '../components/ProductImage';

type Status = { kind: 'loading' } | { kind: 'done'; outcome: WishlistOutcome };

/** Where to paste the list link, when the page is opened without one. */
function WishlistLinkForm() {
  const copy = useCopy();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseLink(value);
    if (parsed.kind === 'wishlist') {
      navigate(`/wishlist?url=${encodeURIComponent(parsed.canonicalUrl)}`);
    } else if (parsed.kind === 'short') {
      navigate(`/wishlist?url=${encodeURIComponent(parsed.url)}`);
    } else {
      setError(copy.wishlist.invalidLink);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-3xl bg-white p-6 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800"
    >
      <p className="text-sm text-stone-600 dark:text-stone-300">{copy.wishlist.intro}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="wishlist-link" className="sr-only">
          {copy.wishlist.title}
        </label>
        <input
          id="wishlist-link"
          type="text"
          inputMode="url"
          autoComplete="off"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          placeholder={copy.wishlist.placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'wishlist-link-error' : undefined}
          className="min-h-11 flex-1 rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
        />
        <Button type="submit">{copy.wishlist.submit}</Button>
      </div>
      {error && (
        <p
          id="wishlist-link-error"
          role="alert"
          className="text-sm text-rose-600 dark:text-rose-300"
        >
          {error}
        </p>
      )}
    </form>
  );
}

export function WishlistPage() {
  const copy = useCopy();
  const [params] = useSearchParams();
  const url = params.get('url') ?? '';
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{copy.wishlist.title}</h1>
      {url ? <WishlistImport key={url} url={url} /> : <WishlistLinkForm />}
    </div>
  );
}

function WishlistImport({ url }: { url: string }) {
  const copy = useCopy();
  const navigate = useNavigate();
  const items = useItemsStore((state) => state.items);
  const queue = useQueueStore((state) => state.queue);
  const add = useQueueStore((state) => state.add);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionError, setSelectionError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchWishlist(url, controller.signal).then((outcome) => {
      if (!controller.signal.aborted) setStatus({ kind: 'done', outcome });
    });
    return () => controller.abort();
  }, [url, attempt]);

  const evaluated = useMemo(() => new Set(items.map((item) => queueKey(item.source))), [items]);
  const queued = useMemo(() => new Set(queue.map((product) => queueKey(product.source))), [queue]);

  if (status.kind === 'loading') {
    return <Notice tone="info">{copy.wishlist.loading}</Notice>;
  }
  const { outcome } = status;
  if (!outcome.ok) {
    return (
      <div className="space-y-4">
        <Notice tone="warning">{copy.wishlist.reasons[outcome.reason]}</Notice>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              setStatus({ kind: 'loading' });
              setAttempt((n) => n + 1);
            }}
          >
            {copy.wishlist.retry}
          </Button>
          <ButtonLink to="/" variant="ghost">
            {copy.wishlist.back}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const { list } = outcome;
  const toggle = (asin: string) => {
    setSelectionError(false);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(asin)) next.delete(asin);
      else next.add(asin);
      return next;
    });
  };
  const allSelected = list.items.length > 0 && list.items.every((i) => selected.has(i.asin));
  const selectAll = () => {
    setSelectionError(false);
    setSelected(allSelected ? new Set() : new Set(list.items.map((i) => i.asin)));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const chosen = list.items.filter((item) => selected.has(item.asin));
    if (chosen.length === 0) {
      setSelectionError(true);
      return;
    }
    add(chosen.map((item) => toQueueInput(item, list.marketplace, list.title)));
    navigate('/');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Notice tone="success">
        {copy.wishlist.found(list.items.length, list.title)} {copy.wishlist.partial}
      </Notice>
      <fieldset className="rounded-3xl bg-white p-4 ring-1 ring-stone-200 sm:p-6 dark:bg-stone-900 dark:ring-stone-800">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {copy.wishlist.products}
        </legend>
        <div className="mt-2 mb-3">
          <Button variant="ghost" onClick={selectAll}>
            {allSelected ? copy.wishlist.deselectAll : copy.wishlist.selectAll}
          </Button>
        </div>
        <ul className="space-y-2">
          {list.items.map((item) => {
            const key = queueKey({ url: item.url, asin: item.asin });
            const state = evaluated.has(key)
              ? copy.wishlist.alreadyEvaluated
              : queued.has(key)
                ? copy.wishlist.alreadyQueued
                : null;
            const checked = selected.has(item.asin);
            return (
              <li key={item.asin}>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl p-2 ring-1 transition-colors focus-within:ring-2 focus-within:ring-brand-500 ${
                    checked
                      ? 'bg-brand-100 ring-brand-500 dark:bg-brand-900/60 dark:ring-brand-500'
                      : 'ring-stone-200 hover:bg-stone-50 dark:ring-stone-700 dark:hover:bg-stone-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item.asin)}
                    className="h-5 w-5 shrink-0 accent-brand-700"
                  />
                  <ProductImage
                    src={item.imageUrl ?? undefined}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold leading-snug">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
                      {item.price
                        ? formatPrice(item.price.amount, item.price.currency, copy.locale)
                        : copy.wishlist.noPrice}
                      {state && ` · ${state}`}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      {selectionError && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">
          {copy.wishlist.selectOne}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ButtonLink to="/" variant="ghost">
          {copy.wishlist.back}
        </ButtonLink>
        <Button type="submit" size="lg">
          {copy.wishlist.add(selected.size)}
        </Button>
      </div>
    </form>
  );
}

function toQueueInput(
  item: WishlistItem,
  marketplace: string,
  listTitle: string | null,
): QueueInput {
  return {
    source: { url: item.url, asin: item.asin, marketplace },
    title: item.title,
    ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
    ...(item.price ? { price: item.price } : {}),
    ...(listTitle ? { listTitle } : {}),
  };
}
