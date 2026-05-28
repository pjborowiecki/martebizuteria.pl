const MINOR_UNITS_PER_MAJOR = 100;

/**
 * Formats an amount expressed in minor units (grosze / cents) as a localized
 * currency string, e.g. `formatPrice(24900, "PLN", "pl")` → `"249,00 zł"`.
 */
export function formatPrice(amountInMinorUnits: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { currency, style: "currency" }).format(amountInMinorUnits / MINOR_UNITS_PER_MAJOR);
}
