import { describe, expect, it } from 'vitest';
import { formatDate, formatPrice, formatRelativeDate, parsePriceInput } from './format';

describe('parsePriceInput', () => {
  it('understands Italian and English notations', () => {
    expect(parsePriceInput('12,99')).toBe(12.99);
    expect(parsePriceInput('12.99')).toBe(12.99);
    expect(parsePriceInput('€ 1.299,00')).toBe(1299);
    expect(parsePriceInput('1,299.00')).toBe(1299);
    expect(parsePriceInput('49')).toBe(49);
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('abc')).toBeNull();
    expect(parsePriceInput('-5')).toBeNull();
  });
});

describe('formatPrice', () => {
  it('formats with the currency', () => {
    expect(formatPrice(12.5, 'EUR').replace(/\s/g, ' ')).toBe('12,50 €');
  });
});

describe('formatRelativeDate', () => {
  const now = new Date('2026-09-29T10:00:00Z');

  it('says today for the same calendar day', () => {
    expect(formatRelativeDate('2026-09-29T01:00:00Z', 'it-IT', now)).toBe('oggi');
    expect(formatRelativeDate('2026-09-29T23:59:00Z', 'en-US', now)).toBe('today');
  });

  it('says yesterday for the previous calendar day, even late in the evening', () => {
    expect(formatRelativeDate('2026-09-28T10:00:00Z', 'it-IT', now)).toBe('ieri');
    expect(formatRelativeDate('2026-09-28T23:30:00Z', 'it-IT', now)).toBe('ieri');
    expect(formatRelativeDate('2026-09-28T23:30:00Z', 'en-US', now)).toBe('yesterday');
  });

  it('counts days under a week', () => {
    expect(formatRelativeDate('2026-09-26T10:00:00Z', 'it-IT', now)).toBe('3 giorni fa');
    expect(formatRelativeDate('2026-09-26T10:00:00Z', 'en-US', now)).toBe('3 days ago');
  });

  it('switches to weeks under a month', () => {
    expect(formatRelativeDate('2026-09-19T10:00:00Z', 'it-IT', now)).toMatch(/settiman/);
    expect(formatRelativeDate('2026-09-19T10:00:00Z', 'en-US', now)).toMatch(/week/);
    expect(formatRelativeDate('2026-09-08T10:00:00Z', 'it-IT', now)).toBe('3 settimane fa');
  });

  it('switches to months under a year', () => {
    expect(formatRelativeDate('2026-08-15T10:00:00Z', 'it-IT', now)).toMatch(/mese/);
    expect(formatRelativeDate('2026-08-15T10:00:00Z', 'en-US', now)).toMatch(/month/);
    expect(formatRelativeDate('2026-06-01T10:00:00Z', 'it-IT', now)).toBe('4 mesi fa');
  });

  it('falls back to the absolute date beyond a year', () => {
    const iso = '2025-08-25T10:00:00Z';
    expect(formatRelativeDate(iso, 'it-IT', now)).toBe(formatDate(iso, 'it-IT'));
    expect(formatRelativeDate(iso, 'en-US', now)).toBe(formatDate(iso, 'en-US'));
    expect(formatRelativeDate(iso, 'it-IT', now)).toBe('25 ago 2025');
  });

  it('handles future dates', () => {
    expect(formatRelativeDate('2026-09-30T08:00:00Z', 'it-IT', now)).toBe('domani');
    expect(formatRelativeDate('2026-09-30T08:00:00Z', 'en-US', now)).toBe('tomorrow');
    expect(formatRelativeDate('2026-10-04T10:00:00Z', 'it-IT', now)).toBe('tra 5 giorni');
    expect(formatRelativeDate('2026-10-04T10:00:00Z', 'en-US', now)).toBe('in 5 days');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatRelativeDate('not a date', 'it-IT', now)).toBe('');
    expect(formatRelativeDate('', 'en-US', now)).toBe('');
  });
});
