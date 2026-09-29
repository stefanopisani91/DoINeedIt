export function formatPrice(amount: number, currency: string, locale = 'it-IT'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatDate(iso: string, locale = 'it-IT'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30.44;

/** Midnight UTC of the calendar day the date falls on, in milliseconds. */
function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * A human date relative to `now`: "oggi", "ieri", "3 giorni fa", "2 settimane fa",
 * "3 mesi fa" (Intl.RelativeTimeFormat with numeric 'auto'); beyond 12 months,
 * or for an invalid date, falls back to formatDate. Works for future dates too
 * ("domani", "tra 5 giorni"). Never throws: without Intl support returns formatDate.
 */
export function formatRelativeDate(iso: string, locale = 'it-IT', now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || Number.isNaN(now.getTime())) return formatDate(iso, locale);
  // Compare calendar days at midnight UTC, so "yesterday" is yesterday even at 00:30.
  const days = Math.round((utcDayStart(date) - utcDayStart(now)) / MS_PER_DAY);
  const distance = Math.abs(days);
  const sign = days < 0 ? -1 : 1;
  let unit: Intl.RelativeTimeFormatUnit;
  let value: number;
  if (distance === 0) {
    unit = 'day';
    value = 0;
  } else if (distance < 7) {
    unit = 'day';
    value = sign * distance;
  } else if (distance < 30) {
    unit = 'week';
    value = sign * Math.max(1, Math.round(distance / 7));
  } else if (distance < 365) {
    unit = 'month';
    value = sign * Math.max(1, Math.round(distance / DAYS_PER_MONTH));
  } else {
    return formatDate(iso, locale);
  }
  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit);
  } catch {
    return formatDate(iso, locale);
  }
}

/** Parses a price typed by a person: "12,99", "12.99", "€ 1.299,00", "1,299.00". */
export function parsePriceInput(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized: string;
  if (lastComma > lastDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, '');
  } else {
    normalized = cleaned;
  }
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
