import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { CategoryId } from '@/engine';
import { useCopy } from '@/i18n';
import { fetchPreview, type PreviewOutcome } from '@/api/preview';
import { parseLink } from '@/lib/amazon-url';
import { parsePriceInput } from '@/lib/format';
import { MAX_TITLE_LENGTH, resolveShareTarget } from '@/lib/share-target';
import { useDraftStore } from '@/storage/draft';
import { selectQueued, useQueueStore, type QueuedProduct } from '@/storage/queue';
import type { Draft } from '@/storage/types';
import { Button, ButtonLink } from '../components/Button';
import { Notice } from '../components/Notice';
import { ProductImage } from '../components/ProductImage';
import { useCategories } from '../hooks';

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'done'; outcome: PreviewOutcome };

interface FormState {
  title: string;
  price: string;
  imageUrl: string;
  category: CategoryId;
}

export function NewItemPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const intent = useMemo(() => resolveShareTarget(params), [params]);
  const queued = useQueueStore(selectQueued(params.get('queue')));
  const link = useMemo(() => parseLink(intent.kind === 'url' ? intent.url : ''), [intent]);

  // A link received from the share sheet goes to the canonical /new?url=…,
  // replacing the share URL so that "back" does not land on it again. A wish
  // list has its own page.
  useEffect(() => {
    if (intent.kind === 'redirect') {
      navigate(`/new?url=${encodeURIComponent(intent.url)}`, { replace: true });
    } else if (link.kind === 'wishlist') {
      navigate(`/wishlist?url=${encodeURIComponent(link.canonicalUrl)}`, { replace: true });
    }
  }, [intent, link, navigate]);

  if (intent.kind === 'redirect' || link.kind === 'wishlist') return null;
  if (queued) return <NewItemForm key={queued.id} url="" initialTitle="" queued={queued} />;
  const url = intent.kind === 'url' ? intent.url : '';
  const initialTitle = intent.kind === 'manual' ? intent.title : '';
  // Remount on a different link so every piece of state starts fresh.
  return <NewItemForm key={url || initialTitle} url={url} initialTitle={initialTitle} />;
}

function priceInput(amount: number, decimalSeparator: string): string {
  return String(amount).replace('.', decimalSeparator);
}

function NewItemForm({
  url,
  initialTitle,
  queued,
}: {
  url: string;
  initialTitle: string;
  queued?: QueuedProduct;
}) {
  const copy = useCopy();
  const categories = useCategories();
  const navigate = useNavigate();
  const link = parseLink(url);
  const canPreview =
    !queued &&
    (link.kind === 'product' ||
      link.kind === 'short' ||
      link.kind === 'amazon-other' ||
      link.kind === 'other');
  const setDraft = useDraftStore((state) => state.setDraft);
  const removeQueued = useQueueStore((state) => state.remove);
  const decimalSeparator = copy.lang === 'it' ? ',' : '.';

  const [status, setStatus] = useState<Status>(canPreview ? { kind: 'loading' } : { kind: 'idle' });
  const [form, setForm] = useState<FormState>({
    title: queued?.title ?? initialTitle,
    price: queued?.price ? priceInput(queued.price.amount, decimalSeparator) : '',
    imageUrl: queued?.imageUrl ?? '',
    category: 'other',
  });
  const [attempt, setAttempt] = useState(0);
  const [titleError, setTitleError] = useState(false);

  useEffect(() => {
    if (!canPreview) return;
    const controller = new AbortController();
    fetchPreview(url, controller.signal).then((outcome) => {
      if (controller.signal.aborted) return;
      setStatus({ kind: 'done', outcome });
      if (outcome.ok) {
        setForm((current) => ({
          ...current,
          title: outcome.product.title ?? current.title,
          imageUrl: outcome.product.imageUrl ?? current.imageUrl,
          price: outcome.product.price
            ? priceInput(outcome.product.price.amount, decimalSeparator)
            : current.price,
        }));
      }
    });
    return () => controller.abort();
  }, [url, canPreview, attempt, decimalSeparator]);

  const previewCurrency =
    status.kind === 'done' && status.outcome.ok
      ? (status.outcome.product.price?.currency ?? 'EUR')
      : (queued?.price?.currency ?? 'EUR');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) {
      setTitleError(true);
      return;
    }
    const amount = parsePriceInput(form.price);
    const resolved = status.kind === 'done' && status.outcome.ok ? status.outcome.product : null;
    const source = queued
      ? queued.source
      : {
          url: resolved?.url ?? (link.kind === 'invalid' ? '' : link.url),
          ...(resolved?.asin
            ? { asin: resolved.asin }
            : link.kind === 'product'
              ? { asin: link.asin }
              : {}),
          ...(resolved?.marketplace
            ? { marketplace: resolved.marketplace }
            : link.kind === 'product' || link.kind === 'amazon-other'
              ? { marketplace: link.marketplace }
              : {}),
        };
    const draft: Draft = {
      source,
      title,
      category: form.category,
      ...(form.imageUrl.trim() && /^(https?:\/\/|\/)/.test(form.imageUrl.trim())
        ? { imageUrl: form.imageUrl.trim() }
        : {}),
      ...(amount !== null && amount > 0 ? { price: { amount, currency: previewCurrency } } : {}),
    };
    setDraft(draft);
    if (queued) removeQueued(queued.id);
    navigate('/evaluate');
  };

  const notice = (() => {
    if (queued) return <Notice tone="info">{copy.newItem.fromQueue}</Notice>;
    if (status.kind === 'loading') return <Notice tone="info">{copy.newItem.loading}</Notice>;
    if (status.kind === 'done') {
      const { outcome } = status;
      if (outcome.ok) {
        return <Notice tone="success">{copy.newItem.previewOk(outcome.product.site)}</Notice>;
      }
      if (outcome.reason === 'wishlist') {
        return (
          <Notice tone="warning">
            {copy.newItem.reasons.wishlist}{' '}
            <Link
              to={`/wishlist?url=${encodeURIComponent(outcome.url)}`}
              className="font-semibold underline underline-offset-4"
            >
              {copy.newItem.importWishlist}
            </Link>
          </Notice>
        );
      }
      return <Notice tone="warning">{copy.newItem.reasons[outcome.reason]}</Notice>;
    }
    if (!url) return <Notice tone="info">{copy.newItem.reasons.none}</Notice>;
    return <Notice tone="warning">{copy.newItem.reasons.unsupported}</Notice>;
  })();

  const failed =
    status.kind === 'done' && !status.outcome.ok && status.outcome.reason !== 'wishlist';

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{copy.newItem.title}</h1>
      {notice}
      {failed && (
        <Button
          variant="ghost"
          onClick={() => {
            setStatus({ kind: 'loading' });
            setAttempt((n) => n + 1);
          }}
        >
          {copy.newItem.retry}
        </Button>
      )}

      <div className="grid gap-6 rounded-3xl bg-white p-6 ring-1 ring-stone-200 sm:grid-cols-[10rem_1fr] dark:bg-stone-900 dark:ring-stone-800">
        <ProductImage
          src={form.imageUrl || undefined}
          alt=""
          className="mx-auto h-40 w-40 rounded-2xl sm:mx-0"
        />
        <div className="space-y-4">
          <Field
            label={copy.newItem.fields.title}
            id="title"
            error={titleError ? copy.newItem.titleRequired : null}
          >
            <input
              id="title"
              type="text"
              aria-required="true"
              maxLength={MAX_TITLE_LENGTH}
              value={form.title}
              onChange={(event) => {
                setForm({ ...form, title: event.target.value });
                setTitleError(false);
              }}
              placeholder={copy.newItem.fields.titlePlaceholder}
              className={inputClass}
              disabled={status.kind === 'loading'}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.newItem.fields.price} id="price">
              <input
                id="price"
                type="text"
                inputMode="decimal"
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                placeholder={copy.newItem.fields.pricePlaceholder}
                className={inputClass}
                disabled={status.kind === 'loading'}
              />
            </Field>
            <Field label={copy.newItem.fields.imageUrl} id="image">
              <input
                id="image"
                type="url"
                value={form.imageUrl}
                onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                placeholder={copy.newItem.fields.imagePlaceholder}
                className={inputClass}
                disabled={status.kind === 'loading'}
              />
            </Field>
          </div>
        </div>
      </div>

      <fieldset className="rounded-3xl bg-white p-6 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {copy.newItem.fields.category}
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {categories.map((category) => {
            const selected = form.category === category.id;
            return (
              <label
                key={category.id}
                className={`flex cursor-pointer flex-col rounded-2xl px-3 py-3 ring-1 transition-colors focus-within:ring-2 focus-within:ring-brand-500 ${
                  selected
                    ? 'bg-brand-100 ring-brand-500 dark:bg-brand-900/60 dark:ring-brand-500'
                    : 'ring-stone-200 hover:bg-stone-50 dark:ring-stone-700 dark:hover:bg-stone-800'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={category.id}
                  checked={selected}
                  onChange={() => setForm({ ...form, category: category.id })}
                  className="sr-only"
                />
                <span className="text-xl" aria-hidden="true">
                  {category.emoji}
                </span>
                <span className="mt-1 text-sm font-semibold">{category.label}</span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {category.description}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ButtonLink to="/" variant="ghost">
          {copy.newItem.back}
        </ButtonLink>
        <Button type="submit" size="lg" disabled={status.kind === 'loading'}>
          {copy.newItem.start}
        </Button>
      </div>
    </form>
  );
}

const inputClass =
  'min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100';

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
