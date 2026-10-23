/**
 * Price helpers.
 *
 * Prices are stored as integer millimes (1 DT = 1000 millimes).
 * Display format follows the Tunisian convention used on the board: 3.500 DT.
 */

/** 3500 -> "3.500" */
export function formatPrice(millimes: number): string {
  const sign = millimes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(millimes));
  const whole = Math.floor(abs / 1000);
  const rest = String(abs % 1000).padStart(3, '0');
  return `${sign}${whole}.${rest}`;
}

/** 3500 -> "3.500 DT" */
export function formatPriceWithUnit(millimes: number): string {
  return `${formatPrice(millimes)} DT`;
}

/**
 * Parses an amount typed by the owner into millimes.
 *
 * Accepted forms:
 *   "3.500"  -> 3500   (board format: dot separates the dinar part)
 *   "3,5"    -> 3500   (decimal amount in DT)
 *   "3.50"   -> 3500
 *   "12"     -> 12000  (plain amount in DT)
 *
 * Returns null when the input cannot be understood.
 *
 * A space *inside* the number is refused on purpose: "1 200" is ambiguous
 * between 1.200 DT and 1 200 DT, and guessing wrong would multiply a café
 * price by a thousand. Surrounding spaces are fine.
 */
export function parsePrice(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;
  // `\s` covers the non-breaking (U+00A0) and narrow non-breaking (U+202F)
  // spaces that French typography and copy-paste introduce.
  if (/\s/.test(raw)) return null;
  if (!/^\d{1,5}([.,]\d{1,3})?$/.test(raw)) return null;

  const [wholePart, fractionPart = ''] = raw.split(/[.,]/);

  if (fractionPart.length === 3) {
    // Board format "3.500" -> 3 DT 500 millimes.
    return Number(wholePart) * 1000 + Number(fractionPart);
  }

  // Decimal amount in DT.
  const decimals = fractionPart.padEnd(3, '0');
  return Number(wholePart) * 1000 + Number(decimals);
}
