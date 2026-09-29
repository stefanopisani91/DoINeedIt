import { useId } from 'react';

export interface BarSegment {
  label: string;
  value: number;
  /** A static `fill-*` class for the rectangle. */
  className: string;
}

export interface BarGroup {
  label: string;
  /** Same labels, same order, in every group: the table takes its columns from the first one. */
  segments: BarSegment[];
}

interface BarChartProps {
  title: string;
  groups: BarGroup[];
  formatValue: (value: number) => string;
  /** The `<summary>` of the data table. */
  showDataLabel: string;
  tableCaption: string;
  labelHeader: string;
  totalHeader: string;
}

const WIDTH = 320;
const HEIGHT = 160;
/** Room above the tallest bar for its total. */
const TOP = 18;
/** Room under the baseline for the group labels. */
const BOTTOM = 20;
const BASELINE = HEIGHT - BOTTOM;
const PLOT = BASELINE - TOP;
const MAX_BAR_WIDTH = 40;
/** Surface-colored gap between two stacked segments, in viewBox units. */
const GAP = 1;

function totalOf(group: BarGroup): number {
  return group.segments.reduce((sum, segment) => sum + segment.value, 0);
}

/**
 * Vertical stacked bars, static: no animation, no hover. Every value is in the
 * table under the disclosure; the picture is for the shape of the months.
 */
export function BarChart({
  title,
  groups,
  formatValue,
  showDataLabel,
  tableCaption,
  labelHeader,
  totalHeader,
}: BarChartProps) {
  const captionId = useId();
  const totals = groups.map(totalOf);
  const max = Math.max(1, ...totals);
  const slot = WIDTH / Math.max(1, groups.length);
  const barWidth = Math.min(MAX_BAR_WIDTH, slot * 0.6);
  const columns = groups[0]?.segments.map((segment) => segment.label) ?? [];

  return (
    <figure aria-labelledby={captionId} className="space-y-4">
      <figcaption>
        <h2 id={captionId} className="eyebrow">
          {title}
        </h2>
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        aria-hidden="true"
        focusable="false"
        className="h-40 w-full"
      >
        <line
          x1={0}
          x2={WIDTH}
          y1={BASELINE}
          y2={BASELINE}
          strokeWidth={1}
          className="stroke-line"
        />
        {groups.map((group, index) => {
          const total = totals[index] ?? 0;
          const x = slot * index + (slot - barWidth) / 2;
          const center = x + barWidth / 2;
          const totalHeight = (total / max) * PLOT;
          let used = 0;
          return (
            <g key={group.label}>
              {group.segments.map((segment) => {
                if (segment.value <= 0) return null;
                const height = (segment.value / max) * PLOT;
                const y = BASELINE - used - height;
                const trim = used > 0 ? GAP : 0;
                used += height;
                return (
                  <rect
                    key={segment.label}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(0, height - trim)}
                    className={segment.className}
                  />
                );
              })}
              <text
                x={center}
                y={BASELINE - totalHeight - 5}
                textAnchor="middle"
                className="fill-ink text-[10px] font-medium tabular-nums"
              >
                {formatValue(total)}
              </text>
              <text
                x={center}
                y={HEIGHT - 6}
                textAnchor="middle"
                className="fill-ink-faint text-[10px]"
              >
                {group.label}
              </text>
            </g>
          );
        })}
      </svg>
      <details className="text-sm">
        <summary className="cursor-pointer rounded-control py-3 font-medium text-brand-700 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:text-brand-300">
          {showDataLabel}
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">{tableCaption}</caption>
            <thead>
              <tr className="border-b border-line text-xs text-ink-faint">
                <th scope="col" className="py-1.5 font-medium">
                  {labelHeader}
                </th>
                {columns.map((column) => (
                  <th key={column} scope="col" className="py-1.5 pl-3 text-right font-medium">
                    {column}
                  </th>
                ))}
                <th scope="col" className="py-1.5 pl-3 text-right font-medium">
                  {totalHeader}
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, index) => (
                <tr key={group.label} className="border-b border-line last:border-0">
                  <th scope="row" className="py-1.5 font-normal">
                    {group.label}
                  </th>
                  {group.segments.map((segment) => (
                    <td key={segment.label} className="py-1.5 pl-3 text-right tabular-nums">
                      {formatValue(segment.value)}
                    </td>
                  ))}
                  <td className="py-1.5 pl-3 text-right font-medium tabular-nums">
                    {formatValue(totals[index] ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
