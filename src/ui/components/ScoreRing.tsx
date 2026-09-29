import type { Verdict } from '@/engine';
import { useCopy } from '@/i18n';
import { verdictStyle } from '../verdict';

interface ScoreRingProps {
  score: number;
  verdict: Verdict;
  size?: number;
  label?: string;
}

export function ScoreRing({ score, verdict, size = 168, label }: ScoreRingProps) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const style = verdictStyle(verdict, useCopy());

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="img"
      aria-label={`${score}% ${label ?? ''}`.trim()}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-stone-200 dark:stroke-stone-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={style.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ring-track"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold tabular-nums ${style.text}`}>{score}%</span>
        {label && (
          <span className="mt-1 max-w-[70%] text-center text-xs text-stone-500 dark:text-stone-400">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
