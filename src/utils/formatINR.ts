/**
 * formatINR — compact Indian number formatter
 *
 * Returns:
 *   compact  → "₹10 Cr", "₹9.56 Cr", "₹10 L", "₹50 K", "₹999"
 *   exact    → "₹1,00,00,000" (Indian locale)
 */
export function formatINR(value: number): { compact: string; exact: string } {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  const exact = `${sign}₹${Math.abs(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

  let compact: string;

  if (abs >= 1_00_00_000) {
    // Crore
    const cr = abs / 1_00_00_000;
    compact = `${sign}₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  } else if (abs >= 1_00_000) {
    // Lakh
    const l = abs / 1_00_000;
    compact = `${sign}₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(2)} L`;
  } else if (abs >= 1_000) {
    // Thousand
    const k = abs / 1_000;
    compact = `${sign}₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)} K`;
  } else {
    compact = exact;
  }

  return { compact, exact };
}
