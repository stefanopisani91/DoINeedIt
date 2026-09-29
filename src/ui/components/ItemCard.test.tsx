/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { EXAMPLE_ITEMS } from '@/data/examples';
import { it as itCopy } from '@/i18n/it';
import { addDays } from '@/insights/lifecycle';
import { useSettingsStore } from '@/storage/settings';
import type { Item } from '@/storage/types';
import { ItemCard } from './ItemCard';

// The examples are dated around 2026-09-20; the headphones were evaluated the day before.
const NOW = new Date('2026-09-20T12:00:00.000Z');
const headphones = EXAMPLE_ITEMS[0]!;
const airfryer = EXAMPLE_ITEMS[1]!;

function renderCard(item: Item, highlight: string[] = []) {
  return render(
    <MemoryRouter>
      <ul>
        <ItemCard item={item} highlight={highlight} now={NOW} />
      </ul>
    </MemoryRouter>,
  );
}

/** A "wait" verdict still open, to be reconsidered on the given date. */
function waiting(reconsiderAt: string): Item {
  const item: Item = {
    ...airfryer,
    result: { ...airfryer.result, verdict: 'wait' },
    reconsiderAt,
  };
  delete item.decision;
  delete item.note;
  return item;
}

describe('ItemCard', () => {
  beforeEach(() => {
    // jsdom asks for English; the card is checked in Italian.
    useSettingsStore.getState().setLanguage('it');
  });

  it('is one link to the item, with the title alone in the heading', () => {
    renderCard(headphones);
    const link = screen.getByRole('link', { name: /Cuffie Bluetooth/ });
    expect(link).toHaveAttribute('href', `/items/${headphones.id}`);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(headphones.title);
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(headphones.title);
  });

  it('shows category, price, relative date and the score badge', () => {
    renderCard(headphones);
    expect(screen.getByText(/Tecnologia/)).toBeInTheDocument();
    expect(screen.getByText(/249,00/)).toBeInTheDocument();
    const time = screen.getByText('ieri');
    expect(time.tagName).toBe('TIME');
    expect(time).toHaveAttribute('dateTime', headphones.updatedAt);
    expect(time).toHaveAttribute('title', '19 set 2026');
    expect(screen.getByText(`${headphones.result.score}%`)).toBeInTheDocument();
    expect(
      screen.getByText(itCopy.verdict[headphones.result.verdict].short, { exact: true }),
    ).toBeInTheDocument();
  });

  it('marks the searched words in the title without changing its text', () => {
    renderCard(headphones, ['cuffie', 'rumore']);
    const marks = screen.getByRole('heading', { level: 3 }).querySelectorAll('mark');
    expect([...marks].map((mark) => mark.textContent)).toEqual(['Cuffie', 'rumore']);
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(headphones.title);
  });

  it('shows the recorded outcome and the note marker', () => {
    renderCard(headphones);
    expect(screen.getByText('Non comprato')).toBeInTheDocument();
    expect(screen.getByText('Con nota')).toBeInTheDocument();
  });

  it('shows no chips when there is nothing to say', () => {
    const plain: Item = { ...airfryer, result: { ...airfryer.result, verdict: 'buy' } };
    delete plain.decision;
    delete plain.note;
    delete plain.reconsiderAt;
    renderCard(plain);
    expect(screen.queryByText('Con nota')).not.toBeInTheDocument();
    expect(screen.queryByText(/Ripensaci/)).not.toBeInTheDocument();
    expect(screen.queryByText(/comprato/i)).not.toBeInTheDocument();
  });

  it('counts down the cooling-off of a "wait" verdict and says when it is over', () => {
    renderCard(waiting(addDays(NOW.toISOString(), 5)));
    expect(screen.getByText('Ripensaci tra 5 giorni')).toBeInTheDocument();
  });

  it('says when the cooling-off is over', () => {
    renderCard(waiting(addDays(NOW.toISOString(), -1)));
    expect(screen.getByText('Pronto per il ripensamento')).toBeInTheDocument();
  });
});
