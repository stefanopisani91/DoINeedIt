import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCopy } from '@/i18n';
import { shareUrl } from '@/lib/share';
import { useDraftStore } from '@/storage/draft';
import { useSettingsStore } from '@/storage/settings';
import { selectItem, useItemsStore } from '@/storage/store';
import { Button, ButtonLink } from '../components/Button';
import { buttonClass } from '../components/button-styles';
import { Notice } from '../components/Notice';
import { ResultView } from '../components/ResultView';

export function ItemDetailPage() {
  const copy = useCopy();
  const { id } = useParams();
  const navigate = useNavigate();
  const item = useItemsStore(selectItem(id));
  const upsert = useItemsStore((state) => state.upsert);
  const remove = useItemsStore((state) => state.remove);
  const setDraft = useDraftStore((state) => state.setDraft);
  const budget = useSettingsStore((state) => state.budget);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState(item?.note ?? '');

  if (!item) {
    return (
      <div className="space-y-4">
        <Notice tone="warning">{copy.result.notFound}</Notice>
        <ButtonLink to="/">{copy.notFound.back}</ButtonLink>
      </div>
    );
  }

  const copyLink = async () => {
    const url = shareUrl(item);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt(copy.result.actions.share, url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reevaluate = () => {
    setDraft({
      itemId: item.id,
      createdAt: item.createdAt,
      source: item.source,
      title: item.title,
      category: item.category,
      ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
      ...(item.price ? { price: item.price } : {}),
    });
    navigate('/evaluate');
  };

  const saveNote = () => {
    const trimmed = note.trim();
    if ((item.note ?? '') === trimmed) return;
    const next = { ...item, updatedAt: new Date().toISOString() };
    if (trimmed) next.note = trimmed;
    else delete next.note;
    upsert(next);
  };

  const onDelete = () => {
    if (!window.confirm(copy.result.actions.deleteConfirm)) return;
    remove(item.id);
    navigate('/', { replace: true });
  };

  const budgetNotice = item.result.budget ? null : !budget ? (
    <Notice>
      {copy.result.budgetMissing.setBudget}{' '}
      <Link to="/settings" className="font-semibold underline underline-offset-4">
        {copy.result.budgetMissing.link}
      </Link>
    </Notice>
  ) : !item.price ? (
    <Notice>{copy.result.budgetMissing.addPrice}</Notice>
  ) : null;

  return (
    <div className="space-y-6">
      {budgetNotice}
      <ResultView item={item} />

      <section className="rounded-3xl bg-white p-6 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <label
          htmlFor="note"
          className="mb-2 block text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400"
        >
          {copy.result.noteLabel}
        </label>
        <textarea
          id="note"
          rows={2}
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={saveNote}
          placeholder={copy.result.notePlaceholder}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-stone-700 dark:bg-stone-950"
        />
      </section>

      <div className="flex flex-wrap gap-3">
        <Button onClick={reevaluate}>{copy.result.actions.reevaluate}</Button>
        <Button variant="secondary" onClick={copyLink} aria-live="polite">
          {copied ? copy.result.actions.shared : copy.result.actions.share}
        </Button>
        {item.source.url && (
          <a
            href={item.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass('secondary')}
          >
            {copy.result.actions.open} ↗
          </a>
        )}
        <Button variant="danger" onClick={onDelete} className="ml-auto">
          {copy.result.actions.delete}
        </Button>
      </div>
    </div>
  );
}
