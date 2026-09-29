/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarChart } from './BarChart';
import { Donut } from './Donut';
import { StatTile } from './StatTile';

const SLICES = [
  { label: 'Buy', value: 2, strokeClassName: 'stroke-buy-500', fillClassName: 'bg-buy-500' },
  { label: 'Wait', value: 0, strokeClassName: 'stroke-wait-500', fillClassName: 'bg-wait-500' },
  { label: 'Skip', value: 1, strokeClassName: 'stroke-skip-500', fillClassName: 'bg-skip-500' },
];

function renderDonut(slices = SLICES) {
  return render(
    <Donut
      title="Verdicts"
      slices={slices}
      centerLabel="Evaluations"
      centerValue="3"
      showDataLabel="Show the data"
      tableCaption="Verdicts by count"
      labelHeader="Verdict"
      valueHeader="Count"
    />,
  );
}

describe('Donut', () => {
  it('names the figure, shows the center value and lists every slice in the table', () => {
    renderDonut();
    expect(screen.getByRole('figure', { name: 'Verdicts' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Show the data')).toBeInTheDocument();

    // The table sits under a closed disclosure: query it regardless of visibility.
    const table = screen.getByRole('table', { name: 'Verdicts by count', hidden: true });
    expect(
      within(table).getByRole('rowheader', { name: 'Wait', hidden: true }),
    ).toBeInTheDocument();
    const rows = within(table).getAllByRole('row', { hidden: true });
    expect(rows).toHaveLength(1 + SLICES.length);
    expect(rows[1]).toHaveTextContent(/Buy\s*2/);
    expect(rows[2]).toHaveTextContent(/Wait\s*0/);
    expect(rows[3]).toHaveTextContent(/Skip\s*1/);
  });

  it('draws only the slices with a value, over the background ring', () => {
    const { container } = renderDonut();
    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(3);
    expect(container.querySelector('circle.stroke-buy-500')).not.toBeNull();
    expect(container.querySelector('circle.stroke-skip-500')).not.toBeNull();
    expect(container.querySelector('circle.stroke-wait-500')).toBeNull();
    // The legend still names the empty slice.
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent(/Wait\s*0/);
  });

  it('keeps only the background ring when every value is zero', () => {
    const { container } = renderDonut(SLICES.map((slice) => ({ ...slice, value: 0 })));
    expect(container.querySelectorAll('circle')).toHaveLength(1);
  });
});

const GROUPS = [
  {
    label: 'Jul',
    segments: [
      { label: 'Buy', value: 1, className: 'fill-buy-500' },
      { label: 'Skip', value: 0, className: 'fill-skip-500' },
    ],
  },
  {
    label: 'Aug',
    segments: [
      { label: 'Buy', value: 0, className: 'fill-buy-500' },
      { label: 'Skip', value: 0, className: 'fill-skip-500' },
    ],
  },
  {
    label: 'Sep',
    segments: [
      { label: 'Buy', value: 2, className: 'fill-buy-500' },
      { label: 'Skip', value: 3, className: 'fill-skip-500' },
    ],
  },
];

describe('BarChart', () => {
  it('draws one labelled bar per group and puts the formatted values in the table', () => {
    const { container } = render(
      <BarChart
        title="Per month"
        groups={GROUPS}
        formatValue={(value) => `${value} pcs`}
        showDataLabel="Show the data"
        tableCaption="Evaluations per month"
        labelHeader="Month"
        totalHeader="Total"
      />,
    );
    expect(screen.getByRole('figure', { name: 'Per month' })).toBeInTheDocument();
    // One <g> per group, each with its label under the baseline; only non-zero segments become rectangles.
    expect(container.querySelectorAll('svg g')).toHaveLength(GROUPS.length);
    expect(container.querySelectorAll('svg rect')).toHaveLength(3);
    const texts = [...container.querySelectorAll('svg text')].map((node) => node.textContent);
    expect(texts).toEqual(['1 pcs', 'Jul', '0 pcs', 'Aug', '5 pcs', 'Sep']);

    const table = screen.getByRole('table', { name: 'Evaluations per month', hidden: true });
    const headers = within(table)
      .getAllByRole('columnheader', { hidden: true })
      .map((node) => node.textContent);
    expect(headers).toEqual(['Month', 'Buy', 'Skip', 'Total']);
    const rows = within(table).getAllByRole('row', { hidden: true });
    expect(rows).toHaveLength(1 + GROUPS.length);
    expect(rows[3]).toHaveTextContent(/Sep\s*2 pcs\s*3 pcs\s*5 pcs/);
  });
});

describe('StatTile', () => {
  it('shows the label as the term and the value with its hint as definitions', () => {
    render(
      <dl>
        <StatTile label="Money not spent" value="249,00 €" hint="Not bought" tone="buy" />
      </dl>,
    );
    expect(screen.getByRole('term')).toHaveTextContent('Money not spent');
    const definitions = screen.getAllByRole('definition');
    expect(definitions.map((node) => node.textContent)).toEqual(['249,00 €', 'Not bought']);
  });

  it('leaves the hint out when there is none', () => {
    render(
      <dl>
        <StatTile label="Evaluations" value="3" />
      </dl>,
    );
    expect(screen.getByText('Evaluations')).toBeInTheDocument();
    expect(screen.getAllByRole('definition')).toHaveLength(1);
  });
});
