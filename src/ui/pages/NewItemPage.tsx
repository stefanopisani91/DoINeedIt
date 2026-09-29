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
import { Field, Input } from '../components/Field';
import { describedBy } from '../components/field-styles';
import { Notice } from '../components/Notice';
import { ProductImage } from '../components/ProductImage';
import { PreviewSkeleton } from '../components/Skeleton';
import { Surface } from '../components/Surface';
import { useCategories } from '../hooks';

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'done'; outcome: PreviewOutcome };

/** After this long the notice admits the shop is slow and points to the manual way. */
const SLOW_AFTER_MS = 8_000;

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

  const [status, setStatus] = useState<Status>(() => {
    if (!canPreview) return { kind: 'idle' };
    // Offline there is nothing to wait for: straight to the manual form.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { kind: 'done', outcome: { ok: false, reason: 'network' } };
    }
    return { kind: 'loading' };
  });
  const [slow, setSlow] = useState(false);
  const [form, setForm] = useState<FormState>({
    title: queued?.title ?? initialTitle,
    price: queued?.price ? priceInput(queued.price.amount, decimalSeparator) : '',
    imageUrl: queued?.imageUrl ?? '',
    category: 'other',
  });
  const [titleError, setTitleError] = useState(false);
  const [priceError, setPriceError] = useState(false);

  useEffect(() => {
    if (!canPreview || status.kind !== 'loading') return;
    const controller = new AbortController();
    const slowTimer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
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
    return () => {
      controller.abort();
      window.clearTimeout(slowTimer);
    };
  }, [url, canPreview, decimalSeparator, status.kind]);

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
    if (form.price.trim() && amount === null) {
      setPriceError(true);
      return;
    }
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

  const loading = status.kind === 'loading';
  const retry = () => {
    setSlow(false);
    setStatus({ kind: 'loading' });
  };
  const skipPreview = () => setStatus({ kind: 'idle' });

  const notice = (() => {
    if (queued) return <Notice tone="info">{copy.newItem.fromQueue}</Notice>;
    if (loading) {
      return (
        <Notice
          tone="info"
          icon="spinner"
          action={
            <Button variant="ghost" size="sm" onClick={skipPreview}>
              {copy.newItem.skipPreview}
            </Button>
          }
        >
          {slow ? copy.newItem.slow : copy.newItem.loading}
        </Notice>
      );
    }
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
      return (
        <Notice
          tone="warning"
          action={
            <Button variant="ghost" size="sm" leadingIcon="refresh" onClick={retry}>
              {copy.newItem.retry}
            </Button>
          }
        >
          {copy.newItem.reasons[outcome.reason]}
        </Notice>
      );
    }
    if (!url) return <Notice tone="info">{copy.newItem.reasons.none}</Notice>;
    return <Notice tone="warning">{copy.newItem.reasons.unsupported}</Notice>;
  })();

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <h1 className="text-title font-bold">{copy.newItem.title}</h1>
      {notice}

      <Surface>
        {loading ? (
          <PreviewSkeleton />
        ) : (
          <div className="grid gap-6 sm:grid-cols-[10rem_1fr]">
            <ProductImage
              src={form.imageUrl || undefined}
              alt=""
              className="mx-auto h-40 w-40 rounded-tile sm:mx-0"
            />
            <div className="space-y-4">
              <Field
                label={copy.newItem.fields.title}
                id="title"
                error={titleError ? copy.newItem.titleRequired : null}
              >
                <Input
                  id="title"
                  type="text"
                  aria-required="true"
                  invalid={titleError}
                  aria-describedby={describedBy('title', undefined, titleError ? 'x' : null)}
                  maxLength={MAX_TITLE_LENGTH}
                  value={form.title}
                  onChange={(event) => {
                    setForm({ ...form, title: event.target.value });
                    setTitleError(false);
                  }}
                  placeholder={copy.newItem.fields.titlePlaceholder}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={copy.newItem.fields.price}
                  id="price"
                  error={priceError ? copy.newItem.priceInvalid : null}
                >
                  <Input
                    id="price"
                    type="text"
                    inputMode="decimal"
                    invalid={priceError}
                    aria-describedby={describedBy('price', undefined, priceError ? 'x' : null)}
                    value={form.price}
                    onChange={(event) => {
                      setForm({ ...form, price: event.target.value });
                      setPriceError(false);
                    }}
                    placeholder={copy.newItem.fields.pricePlaceholder}
                  />
                </Field>
                <Field label={copy.newItem.fields.imageUrl} id="image">
                  <Input
                    id="image"
                    type="url"
                    value={form.imageUrl}
                    onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                    placeholder={copy.newItem.fields.imagePlaceholder}
                  />
                </Field>
              </div>
            </div>
          </div>
        )}
      </Surface>

      <Surface as="div">
        <fieldset>
          <legend className="eyebrow px-1">{copy.newItem.fields.category}</legend>
          <p className="mt-1 text-sm text-ink-muted">{copy.newItem.fields.categoryHint}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {categories.map((category) => {
              const selected = form.category === category.id;
              return (
                <label
                  key={category.id}
                  className={`flex min-h-24 cursor-pointer flex-col rounded-tile px-3 py-3 ring-1 transition-colors focus-within:ring-2 focus-within:ring-brand-500 ${
                    selected
                      ? 'bg-brand-100 ring-brand-500 dark:bg-brand-900/60 dark:ring-brand-500'
                      : 'ring-line hover:bg-surface-sunken'
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
                  <span className="text-2xl" aria-hidden="true">
                    {category.emoji}
                  </span>
                  <span className="mt-1 text-sm font-semibold">{category.label}</span>
                  <span className="text-xs text-ink-faint">{category.description}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </Surface>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <ButtonLink to="/" variant="ghost">
          {copy.newItem.back}
        </ButtonLink>
        <Button type="submit" size="lg" trailingIcon="chevron-right" disabled={loading}>
          {copy.newItem.start}
        </Button>
      </div>
    </form>
  );
}
