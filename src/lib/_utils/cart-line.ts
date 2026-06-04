import { MIN_PRICE_CENTS, minorUnitsPerMajor, parseMoneyInputToCents } from "~/src/lib/_utils/currency";

/** Display-only line total from persisted cart fields (checkout uses server DB prices). */
export function getCartLineUnitPriceCents(item: { readonly price: string; readonly rawPrice: number }): number {
  if (Number.isFinite(item.rawPrice) && item.rawPrice >= MIN_PRICE_CENTS) {
    return item.rawPrice;
  }

  return parseMoneyInputToCents(item.price);
}

export function getCartLineTotalCents(item: { readonly price: string; readonly qty: number; readonly rawPrice: number }): number {
  return getCartLineUnitPriceCents(item) * item.qty;
}

export function formatCartMoneyFromCents(cents: number, locale: string, currency = "PLN"): string {
  return new Intl.NumberFormat(locale, { currency, style: "currency" }).format(cents / minorUnitsPerMajor(currency));
}
