import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { it } from '@/i18n/it';
import { parseLink } from '@/lib/amazon-url';
import { useItemsStore } from '@/storage/store';
import { EXAMPLE_ITEMS } from '@/data/examples';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ItemCard } from '../components/ItemCard';

export function HomePage() {
  const navigate = useNavigate();
  const items = useItemsStore((state) => state.items);
  const merge = useItemsStore((state) => state.merge);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseLink(value);
    if (parsed.kind === 'invalid') {
      setError(it.home.invalidLink);
      return;
    }
    navigate(`/new?url=${encodeURIComponent(parsed.url)}`);
  };

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-brand-700 px-6 py-8 text-white shadow-lg sm:px-10 sm:py-12 dark:bg-brand-900">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{it.home.title}</h1>
        <p className="mt-3 max-w-xl text-brand-100">{it.home.subtitle}</p>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="link" className="sr-only">
            {it.home.title}
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
            placeholder={it.home.placeholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'link-error' : undefined}
            className="min-h-14 flex-1 rounded-xl border-0 bg-white px-4 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <Button
            type="submit"
            size="lg"
            className="bg-amber-400 text-stone-950 hover:bg-amber-300 dark:bg-amber-400 dark:hover:bg-amber-300"
          >
            {it.home.submit}
          </Button>
        </form>
        {error && (
          <p id="link-error" role="alert" className="mt-3 text-sm font-medium text-amber-200">
            {error}
          </p>
        )}
        <Link
          to="/new"
          className="mt-4 inline-block text-sm text-brand-100 underline underline-offset-4 hover:text-white"
        >
          {it.home.manualLink}
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">{it.home.listTitle}</h2>
          {items.length > 0 && (
            <span className="text-sm text-stone-500 dark:text-stone-400">
              {it.home.count(items.length)}
            </span>
          )}
        </div>
        {items.length === 0 ? (
          <EmptyState
            title={it.home.empty.title}
            body={it.home.empty.body}
            action={
              <Button variant="secondary" onClick={() => merge(EXAMPLE_ITEMS)}>
                {it.home.empty.examples}
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
