import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCopy } from '@/i18n';
import { coolingOff } from '@/insights/lifecycle';
import { formatDate } from '@/lib/format';
import { shareUrl } from '@/lib/share';
import { useDraftStore } from '@/storage/draft';
import { useSettingsStore } from '@/storage/settings';
import { selectItem, useItemsStore } from '@/storage/store';
import type { Item } from '@/storage/types';
import { Button, ButtonAnchor, ButtonLink } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DecisionCard } from '../components/DecisionCard';
import { Field, Textarea } from '../components/Field';
import { controlClass } from '../components/field-styles';
import { HistoryList } from '../components/HistoryList';
import { Icon } from '../components/Icon';
import { Notice } from '../components/Notice';
import { ResultView } from '../components/ResultView';
import { Surface } from '../components/Surface';
import { verdictStyle } from '../verdict';

/** How long a transient confirmation ("copied", "saved") stays on. */
const FEEDBACK_MS = 2000;

/** A flag that switches itself off after `ms`; the timer dies with the component. */
function useTransientFlag(ms: number): [boolean, () => void] {
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const trigger = useCallback(() => {
    setActive(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setActive(false), ms);
  }, [ms]);
  return [active, trigger];
}

/** Where a "wait" verdict stands in its cooling-off period; nothing for the other verdicts. */
function CoolingOffNotice({ item, now }: { item: Item; now: Date }) {
  const copy = useCopy();
  const cooling = coolingOff(item, now);
  if (cooling.state === 'none' || cooling.reconsiderAt === null) return null;
  if (cooling.state === 'ready') {
    return (
      <Notice tone="warning">
        <span className="flex items-start gap-2">
          <Icon name="clock" size={16} className="mt-0.5" />
          <span>{copy.coolingOff.expired}</span>
        </span>
      </Notice>
    );
  }
  // The sentence comes whole from the copy; the date inside it becomes a <time>.
  const date = formatDate(cooling.reconsiderAt, copy.locale);
  const sentence = copy.coolingOff.until(date, cooling.daysLeft);
  const [before = '', after = ''] = date ? sentence.split(date) : [sentence];
  return (
    <Notice tone="info">
      <span className="flex items-start gap-2">
        <Icon name="clock" size={16} className="mt-0.5" />
        <span>
          {before}
          {date && (
            <time dateTime={cooling.reconsiderAt} className="font-semibold">
              {date}
            </time>
          )}
          {after}
        </span>
      </span>
    </Notice>
  );
}

export function ItemDetailPage() {
  const copy = useCopy();
  const { id } = useParams();
  const navigate = useNavigate();
  const item = useItemsStore(selectItem(id));
  const setNote = useItemsStore((state) => state.setNote);
  const remove = useItemsStore((state) => state.remove);
  const setDraft = useDraftStore((state) => state.setDraft);
  const budget = useSettingsStore((state) => state.budget);
  const [now] = useState(() => new Date());
  const [copied, flagCopied] = useTransientFlag(FEEDBACK_MS);
  const [noteSaved, flagNoteSaved] = useTransientFlag(FEEDBACK_MS);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [note, setNoteText] = useState(item?.note ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!item) {
    return (
      <div className="space-y-4">
        <Notice tone="warning">{copy.result.notFound}</Notice>
        <ButtonLink to="/">{copy.notFound.back}</ButtonLink>
      </div>
    );
  }

  const style = verdictStyle(item.result.verdict, copy);
  const canShareNatively = typeof navigator.share === 'function';

  const copyLink = async () => {
    const url = shareUrl(item);
    try {
      await navigator.clipboard.writeText(url);
      setFallbackUrl(null);
      flagCopied();
    } catch {
      // No clipboard access: the link is offered in a field, already selected.
      setFallbackUrl(url);
    }
  };

  const shareNative = async () => {
    try {
      await navigator.share({ title: item.title, text: style.label, url: shareUrl(item) });
    } catch (error) {
      // Closing the share sheet is not an error; anything else falls back to copying.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      await copyLink();
    }
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
    setNote(item.id, trimmed);
    flagNoteSaved();
  };

  const onDelete = () => {
    setConfirmingDelete(false);
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
      <CoolingOffNotice item={item} now={now} />
      {budgetNotice}
      <ResultView item={item} />
      <DecisionCard key={item.id} item={item} />
      {item.history && item.history.length > 0 && <HistoryList history={item.history} />}

      <Surface>
        <Field id="note" label={copy.result.noteLabel}>
          <Textarea
            id="note"
            rows={2}
            maxLength={2000}
            value={note}
            onChange={(event) => setNoteText(event.target.value)}
            onBlur={saveNote}
            placeholder={copy.result.notePlaceholder}
          />
        </Field>
        <p role="status" className="sr-only">
          {noteSaved ? copy.result.noteSaved : ''}
        </p>
      </Surface>

      <Surface as="div" className="flex flex-wrap gap-3">
        <Button onClick={reevaluate} leadingIcon="refresh">
          {copy.result.actions.reevaluate}
        </Button>
        {canShareNatively && (
          <Button variant="secondary" leadingIcon="share" onClick={shareNative}>
            {copy.result.actions.shareNative}
          </Button>
        )}
        <Button variant="secondary" leadingIcon="copy" onClick={copyLink} aria-live="polite">
          {copied ? copy.result.actions.shared : copy.result.actions.share}
        </Button>
        {item.source.url && (
          <ButtonAnchor variant="secondary" href={item.source.url}>
            {copy.result.actions.open}
          </ButtonAnchor>
        )}
        <Button
          variant="danger"
          leadingIcon="trash"
          className="ml-auto"
          onClick={() => setConfirmingDelete(true)}
        >
          {copy.result.actions.delete}
        </Button>
        {fallbackUrl && (
          <input
            readOnly
            value={fallbackUrl}
            aria-label={copy.result.actions.share}
            className={`${controlClass} basis-full text-sm`}
            ref={(input) => input?.select()}
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
      </Surface>

      <ConfirmDialog
        open={confirmingDelete}
        title={copy.result.actions.deleteTitle}
        body={copy.result.actions.deleteConfirm}
        confirmLabel={copy.result.actions.deleteYes}
        cancelLabel={copy.result.actions.deleteNo}
        tone="danger"
        onConfirm={onDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
