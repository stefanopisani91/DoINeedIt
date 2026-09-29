import { describe, expect, it } from 'vitest';
import { formatPrice, parsePriceInput } from './format';

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
