import { describe, expect, it } from 'vitest';
import { formatPrice, formatPriceWithUnit, parsePrice } from './price';

describe('formatPrice', () => {
  it('uses the Tunisian board format with a dot separator', () => {
    expect(formatPrice(3500)).toBe('3.500');
    expect(formatPrice(4000)).toBe('4.000');
    expect(formatPrice(4500)).toBe('4.500');
    expect(formatPrice(2000)).toBe('2.000');
    expect(formatPrice(6000)).toBe('6.000');
    expect(formatPrice(8500)).toBe('8.500');
    expect(formatPrice(1000)).toBe('1.000');
    expect(formatPrice(1200)).toBe('1.200');
  });

  it('always prints three decimals', () => {
    expect(formatPrice(5)).toBe('0.005');
    expect(formatPrice(50)).toBe('0.050');
    expect(formatPrice(500)).toBe('0.500');
    expect(formatPrice(0)).toBe('0.000');
  });

  it('handles amounts above 9 DT', () => {
    expect(formatPrice(12000)).toBe('12.000');
    expect(formatPrice(12345)).toBe('12.345');
  });

  it('keeps the sign outside the digits', () => {
    expect(formatPrice(-1500)).toBe('-1.500');
  });

  it('never leaks floating point noise', () => {
    // Millimes are integers; a stray float (e.g. from a DT * 1000 product)
    // must still print cleanly.
    expect(formatPrice(1000 * 0.1 + 1000 * 0.2)).toBe('0.300');
    expect(formatPrice(3500.0000000000005)).toBe('3.500');
  });
});

describe('formatPriceWithUnit', () => {
  it('appends the DT unit', () => {
    expect(formatPriceWithUnit(3500)).toBe('3.500 DT');
    expect(formatPriceWithUnit(1200)).toBe('1.200 DT');
  });
});

describe('parsePrice', () => {
  it('reads the board format as dinar + millimes', () => {
    expect(parsePrice('3.500')).toBe(3500);
    expect(parsePrice('8.500')).toBe(8500);
    expect(parsePrice('1.200')).toBe(1200);
    expect(parsePrice('4.000')).toBe(4000);
  });

  it('reads a decimal amount in DT', () => {
    expect(parsePrice('3,5')).toBe(3500);
    expect(parsePrice('3.50')).toBe(3500);
    expect(parsePrice('1.2')).toBe(1200);
  });

  it('reads a plain amount in DT', () => {
    expect(parsePrice('12')).toBe(12000);
    expect(parsePrice('0')).toBe(0);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parsePrice('  3.500  ')).toBe(3500);
    expect(parsePrice('\t3,5\n')).toBe(3500);
  });

  it('refuses a space inside the number instead of guessing', () => {
    // "1 200" is ambiguous: 1.200 DT or 1 200 DT. Refusing avoids a 1000x error.
    expect(parsePrice('3 . 500')).toBeNull();
    expect(parsePrice('3\u00A0500')).toBeNull();
    expect(parsePrice('1\u202F200')).toBeNull();
  });

  it('refuses anything it cannot understand', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('   ')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('3.5.2')).toBeNull();
    expect(parsePrice('-2')).toBeNull();
    expect(parsePrice('12.3456')).toBeNull();
    expect(parsePrice('3,5 DT')).toBeNull();
  });

  it('round-trips every published price', () => {
    for (const millimes of [3500, 4000, 4500, 2000, 6000, 3000, 8500, 2500, 1000, 1200, 7000]) {
      expect(parsePrice(formatPrice(millimes))).toBe(millimes);
    }
  });
});
