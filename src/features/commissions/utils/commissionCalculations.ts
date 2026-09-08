const currencyFormatter = new Intl.NumberFormat("ar-SA", {
  style: "currency",
  currency: "SAR",
  maximumFractionDigits: 2,
});

/**
 * Calculates the expected platform commission (1% of the sold price, minimum 1.00 SAR).
 * Matches the backend formula in Tihamah-Haraj: Math.max(1.0, ad.Price * 0.01).
 * Returns null if the sold price is missing or non-positive.
 */
export function calculateExpectedCommission(soldPrice: number | null | undefined): number | null {
  if (soldPrice === null || soldPrice === undefined || Number.isNaN(soldPrice) || soldPrice <= 0) {
    return null;
  }
  const raw = soldPrice * 0.01;
  const rounded = Number(raw.toFixed(2));
  return Math.max(1.0, rounded);
}

/**
 * Cross-checks whether an actual commission amount deviates from the expected 1% rate.
 * Discrepancies > 0.01 SAR are flagged as mismatches.
 * Returns false if sold price is unavailable.
 */
export function isCommissionMismatch(
  actualAmount: number | null | undefined,
  soldPrice: number | null | undefined,
): boolean {
  if (actualAmount === null || actualAmount === undefined || Number.isNaN(actualAmount)) {
    return false;
  }
  const expected = calculateExpectedCommission(soldPrice);
  if (expected === null) {
    return false;
  }
  return Math.abs(expected - actualAmount) > 0.01;
}

/**
 * Formats a monetary amount into SAR currency string using Arabic locale.
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "غير متاح";
  }
  return currencyFormatter.format(amount);
}
