/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { it as itCopy } from '@/i18n/it';
import { ScoreRing } from './ScoreRing';

describe('ScoreRing', () => {
  it('is an image named after the score and its label', () => {
    render(<ScoreRing score={42} verdict="wait" label={itCopy.result.scoreLabel} />);
    expect(screen.getByRole('img', { name: '42% necessità d’acquisto' })).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('marks the two verdict thresholds on the track', () => {
    const { container } = render(<ScoreRing score={80} verdict="buy" />);
    expect(screen.getByRole('img', { name: '80%' })).toBeInTheDocument();
    expect(container.querySelectorAll('line')).toHaveLength(2);
  });
});
