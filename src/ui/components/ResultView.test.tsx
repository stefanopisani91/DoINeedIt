/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EXAMPLE_ITEMS } from '@/data/examples';
import { useSettingsStore } from '@/storage/settings';
import { ResultView } from './ResultView';

// The headphones: a clear "skip", later recorded as not bought.
const headphones = EXAMPLE_ITEMS.find((item) => item.id === 'example-headphones')!;

describe('ResultView', () => {
  beforeEach(() => {
    // jsdom asks for English; the texts are checked in Italian.
    useSettingsStore.setState({ language: 'it' });
  });

  it('spells out the verdict once, with the ring, the facts and the outcome', () => {
    render(<ResultView item={headphones} />);
    expect(screen.getAllByText('Non ti serve')).toHaveLength(1);
    expect(
      screen.getByRole('img', { name: `${headphones.result.score}% necessità d’acquisto` }),
    ).toBeInTheDocument();
    expect(screen.getByText(`Affidabilità ${headphones.result.confidence}%`)).toBeInTheDocument();
    expect(screen.getByText('8 risposte')).toBeInTheDocument();
    expect(screen.getByText('Poi deciso: non comprato')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(headphones.title);
    expect(screen.getByText(/Costa il 62% del tuo budget mensile di 400,00/)).toBeInTheDocument();
  });

  it('shows the price and the note once each, with their own labels', () => {
    render(<ResultView item={headphones} />);
    expect(screen.getAllByText(/249,00/)).toHaveLength(1);
    expect(screen.getByText('Una nota per il te del futuro')).toBeInTheDocument();
    expect(screen.getByText(headphones.note!)).toBeInTheDocument();
    expect(screen.getByText('Le tue risposte')).toBeInTheDocument();
  });

  it('addresses the reader of a shared link, not the author', () => {
    render(<ResultView item={headphones} perspective="shared" />);
    expect(screen.getByText('Le risposte date')).toBeInTheDocument();
    expect(screen.queryByText('Le tue risposte')).toBeNull();
    expect(screen.getByText('Nota di chi ha condiviso')).toBeInTheDocument();
    expect(screen.queryByText('Una nota per il te del futuro')).toBeNull();
  });

  it('tells how the score moved since the previous evaluation', () => {
    const reevaluated = {
      ...headphones,
      history: [
        {
          at: '2026-08-01T10:00:00.000Z',
          score: headphones.result.score + 12,
          verdict: 'wait' as const,
          answeredCount: 8,
        },
      ],
    };
    render(<ResultView item={reevaluated} />);
    expect(screen.getByText('-12 punti rispetto al 1 ago 2026')).toBeInTheDocument();
  });
});
