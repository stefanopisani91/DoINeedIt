import { categoryById } from '@/data/categories';
import type { Copy } from '@/i18n';
import type { Item } from './types';

export type CsvSeparator = ',' | ';';

/** A semicolon where the locale writes decimals with a comma (it-IT), a comma elsewhere. */
export function csvSeparatorFor(locale: string): CsvSeparator {
  try {
    const sample = new Intl.NumberFormat(locale).format(1.5);
    return sample.includes(',') ? ';' : ',';
  } catch {
    return ',';
  }
}

/** Quotes a field when it contains the separator, a quote or a line break. */
export function escapeCsv(field: string, separator: CsvSeparator): string {
  if (/["\r\n]/.test(field) || field.includes(separator)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function numberFormatter(locale: string): (value: number) => string {
  try {
    const format = new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 2 });
    return (value) => format.format(value);
  } catch {
    return (value) => String(value);
  }
}

const COLUMNS = [
  'title',
  'category',
  'price',
  'currency',
  'score',
  'verdict',
  'confidence',
  'answers',
  'maybe',
  'evaluatedAt',
  'budget',
  'budgetShare',
  'decision',
  'decidedAt',
  'pricePaid',
  'note',
  'link',
] as const satisfies ReadonlyArray<keyof Copy['csv']['columns']>;

/**
 * The evaluations as a spreadsheet: one row per item, headers and labels in
 * the language in use, numbers with the locale's decimal separator, a BOM so
 * that Excel reads the UTF-8, CRLF line ends.
 */
export function buildCsv(items: readonly Item[], copy: Copy): string {
  const separator = csvSeparatorFor(copy.locale);
  const num = numberFormatter(copy.locale);
  const header = COLUMNS.map((column) => copy.csv.columns[column]);
  const rows = items.map((item) => {
    const cells: Record<(typeof COLUMNS)[number], string> = {
      title: item.title,
      category: categoryById(item.category, copy).label,
      price: item.price ? num(item.price.amount) : '',
      currency: item.price?.currency ?? '',
      score: num(item.result.score),
      verdict: copy.verdict[item.result.verdict].label,
      confidence: num(item.result.confidence),
      answers: num(item.result.answeredCount),
      maybe: num(item.result.maybeCount),
      evaluatedAt: item.updatedAt,
      budget: item.budget ? num(item.budget.amount) : '',
      budgetShare: item.result.budget ? num(Math.round(item.result.budget.share * 100)) : '',
      decision: item.decision ? copy.decision[item.decision.outcome] : '',
      decidedAt: item.decision?.at ?? '',
      pricePaid: item.decision?.price ? num(item.decision.price.amount) : '',
      note: item.note ?? '',
      link: item.source.url,
    };
    return COLUMNS.map((column) => cells[column]);
  });
  const lines = [header, ...rows].map((row) =>
    row.map((cell) => escapeCsv(cell, separator)).join(separator),
  );
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function exportCsvFileName(date = new Date()): string {
  return `doineedit-${date.toISOString().slice(0, 10)}.csv`;
}
