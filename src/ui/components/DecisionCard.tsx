import { useState } from 'react';
import { useCopy } from '@/i18n';
import { formatDate, formatPrice, parsePriceInput } from '@/lib/format';
import { useItemsStore } from '@/storage/store';
import type { Decision, DecisionOutcome, Item, Price } from '@/storage/types';
import { Button } from './Button';
import { Field, Input } from './Field';
import { Icon, type IconName } from './Icon';
import { Surface } from './Surface';

type Choice = DecisionOutcome | 'pending';

interface DecisionCardProps {
  item: Item;
}

const CHOICES: ReadonlyArray<{ value: Choice; icon: IconName }> = [
  { value: 'bought', icon: 'cart' },
  { value: 'skipped', icon: 'x' },
  { value: 'pending', icon: 'clock' },
];

const RADIO =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';
const RADIO_ON =
  'bg-brand-700 text-white ring-brand-700 dark:bg-brand-500 dark:text-stone-950 dark:ring-brand-500';
const RADIO_OFF = 'bg-surface text-ink ring-line-strong hover:bg-surface-sunken';

/** The price a decision is about: the one paid when recorded, otherwise the listed one. */
function effectivePrice(item: Item): Price | undefined {
  return item.decision?.price ?? item.price;
}

/** A price as a person would type it, with the decimal separator of the language. */
function priceInput(price: Price | undefined, lang: string): string {
  return price ? String(price.amount).replace('.', lang === 'it' ? ',' : '.') : '';
}

/**
 * Records what happened after the verdict. Writes go through `setDecision`,
 * which leaves `updatedAt` alone: deciding is not re-evaluating.
 */
export function DecisionCard({ item }: DecisionCardProps) {
  const copy = useCopy();
  const setDecision = useItemsStore((state) => state.setDecision);
  const { decision } = item;
  const selected: Choice = decision?.outcome ?? 'pending';
  const currency = item.price?.currency ?? 'EUR';
  const price = effectivePrice(item);
  const [paid, setPaid] = useState(() => priceInput(price, copy.lang));
  const parsedPaid = parsePriceInput(paid);

  const labels: Record<Choice, string> = {
    bought: copy.decision.bought,
    skipped: copy.decision.skipped,
    pending: copy.decision.pending,
  };

  const choose = (choice: Choice) => {
    if (choice === 'pending') {
      setDecision(item.id, null);
      return;
    }
    if (choice === decision?.outcome) return;
    // A paid price belongs to a purchase: it does not follow a change of mind.
    const next: Decision = {
      outcome: choice,
      at: new Date().toISOString(),
      ...(choice === 'bought' && decision?.price ? { price: decision.price } : {}),
    };
    setDecision(item.id, next);
  };

  const savePrice = () => {
    if (!decision || parsedPaid === null) return;
    setDecision(item.id, { ...decision, price: { amount: parsedPaid, currency } });
  };

  const status = decision
    ? [
        copy.decision.decidedOn(formatDate(decision.at, copy.locale), labels[decision.outcome]),
        price
          ? decision.outcome === 'skipped'
            ? copy.decision.notSpent(formatPrice(price.amount, price.currency, copy.locale))
            : copy.decision.spent(formatPrice(price.amount, price.currency, copy.locale))
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <Surface>
      <h2 className="eyebrow">{copy.decision.title}</h2>
      <p className="mt-2 text-sm text-ink-muted">{copy.decision.body}</p>
      <div
        role="radiogroup"
        aria-label={copy.decision.group}
        className="mt-4 grid gap-2 sm:grid-cols-3"
      >
        {CHOICES.map(({ value, icon }) => {
          const checked = selected === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => choose(value)}
              className={`${RADIO} ${checked ? RADIO_ON : RADIO_OFF}`}
            >
              <Icon name={icon} size={16} />
              {labels[value]}
            </button>
          );
        })}
      </div>
      {decision?.outcome === 'bought' && (
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            savePrice();
          }}
        >
          <Field id="decision-price" label={copy.decision.pricePaid} className="min-w-40 flex-1">
            <Input
              id="decision-price"
              inputMode="decimal"
              autoComplete="off"
              value={paid}
              onChange={(event) => setPaid(event.target.value)}
            />
          </Field>
          <Button
            type="submit"
            variant="secondary"
            disabled={parsedPaid === null || parsedPaid === price?.amount}
          >
            {copy.decision.savePrice}
          </Button>
        </form>
      )}
      {/* Always mounted, so screen readers announce the outcome when it changes. */}
      <p role="status" className="mt-3 min-h-5 text-sm text-ink-muted tabular-nums">
        {status}
      </p>
    </Surface>
  );
}
