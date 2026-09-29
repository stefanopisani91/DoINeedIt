import { useEffect, useState } from 'react';
import { VERDICT, type Verdict } from '@/engine';
import { useCopy } from '@/i18n';
import { verdictStyle } from '../verdict';

interface ScoreRingProps {
  score: number;
  verdict: Verdict;
  label?: string;
  /** Sizing classes of the box; the drawing scales with it. */
  className?: string;
}

/** The drawing lives in a fixed coordinate space and scales with its box. */
const SIZE = 168;
const STROKE = 12;
const CENTER = SIZE / 2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** The verdict thresholds, marked on the track so the number has a scale. */
const THRESHOLDS: readonly number[] = [VERDICT.wait, VERDICT.buy];

/** A short radial line across the track at the given score, clockwise from the top. */
function tick(percent: number) {
  const angle = (percent / 100) * 2 * Math.PI - Math.PI / 2;
  const inner = RADIUS - STROKE / 2;
  const outer = RADIUS + STROKE / 2;
  return {
    x1: CENTER + Math.cos(angle) * inner,
    y1: CENTER + Math.sin(angle) * inner,
    x2: CENTER + Math.cos(angle) * outer,
    y2: CENTER + Math.sin(angle) * outer,
  };
}

export function ScoreRing({
  score,
  verdict,
  label,
  className = 'h-40 w-40 sm:h-48 sm:w-48',
}: ScoreRingProps) {
  const style = verdictStyle(verdict, useCopy());
  const target = CIRCUMFERENCE * (1 - score / 100);
  // The arc is empty on the first paint and fills on the next frame, so the
  // transition on `.ring-track` runs on entry (reduced motion makes it instant).
  // The accessible name carries the final score from the start.
  const [offset, setOffset] = useState(CIRCUMFERENCE);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOffset(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      role="img"
      aria-label={`${score}% ${label ?? ''}`.trim()}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" aria-hidden="true">
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-line"
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          className={`ring-track ${style.stroke}`}
        />
        {THRESHOLDS.map((threshold) => (
          <line
            key={threshold}
            {...tick(threshold)}
            strokeWidth={2}
            className="stroke-line-strong"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold tabular-nums sm:text-5xl ${style.text}`}>
          {score}%
        </span>
        {label && (
          <span className="mt-1 max-w-[70%] text-center text-xs leading-tight text-ink-faint">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
