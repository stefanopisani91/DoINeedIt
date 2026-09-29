import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EXAMPLE_ITEMS } from '@/data/examples';
import { it } from '@/i18n/it';
import { formatPrice, parsePriceInput } from '@/lib/format';
import { buildExport, exportFileName, parseImport } from '@/storage/export';
import { useSettingsStore } from '@/storage/settings';
import { useItemsStore } from '@/storage/store';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';

const REPOSITORY_URL = 'https://github.com/stefanopisani91/DoINeedIt';

export function SettingsPage() {
  const items = useItemsStore((state) => state.items);
  const merge = useItemsStore((state) => state.merge);
  const clear = useItemsStore((state) => state.clear);
  const budget = useSettingsStore((state) => state.budget);
  const setBudget = useSettingsStore((state) => state.setBudget);
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [budgetInput, setBudgetInput] = useState(() =>
    budget ? String(budget.amount).replace('.', ',') : '',
  );

  const saveBudget = (event: FormEvent) => {
    event.preventDefault();
    const amount = parsePriceInput(budgetInput);
    if (amount === null || amount <= 0) {
      setMessage({ tone: 'error', text: it.settings.budgetInvalid });
      return;
    }
    const next = { amount, currency: 'EUR' };
    setBudget(next);
    setMessage({
      tone: 'success',
      text: it.settings.budgetSaved(formatPrice(next.amount, next.currency)),
    });
  };

  const removeBudget = () => {
    setBudget(null);
    setBudgetInput('');
    setMessage({ tone: 'success', text: it.settings.budgetRemoved });
  };

  const exportFile = () => {
    const blob = new Blob([JSON.stringify(buildExport(items), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exportFileName();
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const outcome = parseImport(await file.text());
    if (!outcome.ok) {
      setMessage({ tone: 'error', text: it.settings.importError[outcome.reason] });
      return;
    }
    const added = merge(outcome.items);
    setMessage({ tone: 'success', text: it.settings.imported(added, outcome.skipped) });
  };

  const loadExamples = () => {
    const added = merge(EXAMPLE_ITEMS);
    setMessage({ tone: 'success', text: it.settings.examplesLoaded(added) });
  };

  const clearAll = () => {
    if (!window.confirm(it.settings.clearConfirm)) return;
    clear();
    setMessage({ tone: 'success', text: it.settings.cleared });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{it.settings.title}</h1>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <section className="space-y-4 rounded-3xl bg-white p-6 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <h2 className="text-lg font-semibold">{it.settings.budgetTitle}</h2>
        <p className="text-sm text-stone-600 dark:text-stone-300">{it.settings.budgetBody}</p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {budget
            ? it.settings.budgetCurrent(formatPrice(budget.amount, budget.currency))
            : it.settings.budgetNone}
        </p>
        <form onSubmit={saveBudget} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 basis-40">
            <label htmlFor="budget" className="mb-1 block text-sm font-medium">
              {it.settings.budgetLabel}
            </label>
            <input
              id="budget"
              type="text"
              inputMode="decimal"
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
              placeholder={it.settings.budgetPlaceholder}
              className="min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-stone-700 dark:bg-stone-950"
            />
          </div>
          <Button type="submit">{it.settings.budgetSave}</Button>
          {budget && (
            <Button type="button" variant="secondary" onClick={removeBudget}>
              {it.settings.budgetRemove}
            </Button>
          )}
        </form>
      </section>

      <section className="space-y-4 rounded-3xl bg-white p-6 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <h2 className="text-lg font-semibold">{it.settings.dataTitle}</h2>
        <p className="text-sm text-stone-600 dark:text-stone-300">{it.settings.dataBody}</p>
        <p className="text-sm text-stone-500 dark:text-stone-400">{it.home.count(items.length)}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportFile} disabled={items.length === 0}>
            {it.settings.export}
          </Button>
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            {it.settings.import}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={importFile}
            aria-label={it.settings.import}
          />
          <Button variant="secondary" onClick={loadExamples}>
            {it.settings.examples}
          </Button>
          <Button variant="danger" onClick={clearAll} disabled={items.length === 0}>
            {it.settings.clear}
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-white p-6 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <h2 className="text-lg font-semibold">{it.settings.aboutTitle}</h2>
        <p className="text-sm text-stone-600 dark:text-stone-300">{it.settings.aboutBody}</p>
        <p className="flex flex-wrap gap-4 text-sm">
          <Link to="/privacy" className="underline underline-offset-4">
            {it.settings.privacy}
          </Link>
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            {it.settings.source} ↗
          </a>
        </p>
      </section>
    </div>
  );
}
