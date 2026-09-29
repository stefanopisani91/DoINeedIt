import { useId } from 'react';

export interface DonutSlice {
  label: string;
  value: number;
  /** A static `stroke-*` class for the ring segment. */
  strokeClassName: string;
  /** A static `bg-*` class for the legend swatch. */
  fillClassName: string;
}

interface DonutProps {
  title: string;
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
  /** The `<summary>` of the data table. */
  showDataLabel: string;
  tableCaption: string;
  labelHeader: string;
  valueHeader: string;
}

const SIZE = 120;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Surface-colored gap between two segments, in viewBox units (about 2px when rendered). */
const GAP = 2;

interface Arc extends DonutSlice {
  /** Where the segment starts along the ring, from 12 o'clock clockwise. */
  start: number;
  length: number;
}

/** Slices with a value, laid along the ring in order; the arcs shrink a little to leave the gaps. */
function arcsOf(slices: DonutSlice[]): Arc[] {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  if (total <= 0) return [];
  const visible = slices.filter((slice) => slice.value > 0);
  const gap = visible.length > 1 ? GAP : 0;
  let offset = 0;
  return visible.map((slice) => {
    const length = (slice.value / total) * CIRCUMFERENCE;
    const arc: Arc = { ...slice, start: offset + gap / 2, length: Math.max(0, length - gap) };
    offset += length;
    return arc;
  });
}

/**
 * A part-to-whole ring, static: no animation, no hover. The numbers live in the
 * legend and in the table under the disclosure, so nothing depends on color.
 */
export function Donut({
  title,
  slices,
  centerLabel,
  centerValue,
  showDataLabel,
  tableCaption,
  labelHeader,
  valueHeader,
}: DonutProps) {
  const captionId = useId();
  const arcs = arcsOf(slices);

  return (
    <figure aria-labelledby={captionId} className="space-y-4">
      <figcaption>
        <h2 id={captionId} className="eyebrow">
          {title}
        </h2>
      </figcaption>
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-40 w-40 shrink-0">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            aria-hidden="true"
            focusable="false"
            className="h-40 w-40"
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              className="stroke-line"
            />
            {arcs.map((arc) => (
              <circle
                key={arc.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
                strokeDashoffset={CIRCUMFERENCE - arc.start}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                className={arc.strokeClassName}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold tabular-nums">{centerValue}</span>
            <span className="max-w-[70%] text-xs text-ink-faint">{centerLabel}</span>
          </div>
        </div>
        <ul className="w-full space-y-2 text-sm">
          {slices.map((slice) => (
            <li key={slice.label} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-3 w-3 shrink-0 rounded-sm ${slice.fillClassName}`}
              />
              <span className="min-w-0 flex-1 truncate">{slice.label}</span>
              <span className="tabular-nums text-ink-muted">{slice.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer rounded-control py-3 font-medium text-brand-700 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-brand-300">
          {showDataLabel}
        </summary>
        <table className="w-full text-left">
          <caption className="sr-only">{tableCaption}</caption>
          <thead>
            <tr className="border-b border-line text-xs text-ink-faint">
              <th scope="col" className="py-1.5 font-medium">
                {labelHeader}
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                {valueHeader}
              </th>
            </tr>
          </thead>
          <tbody>
            {slices.map((slice) => (
              <tr key={slice.label} className="border-b border-line last:border-0">
                <th scope="row" className="py-1.5 font-normal">
                  {slice.label}
                </th>
                <td className="py-1.5 text-right tabular-nums">{slice.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
