import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { MIN_PRICE_CENTS, parseMoneyInputToMinorUnits } from "~/src/modules/_core/utils/currency"

export const getCartLineUnitPriceCents = (item: { readonly price: string; readonly rawPrice: number }): number => {
  if (Number.isFinite(item.rawPrice) && item.rawPrice >= MIN_PRICE_CENTS) {
    return item.rawPrice
  }

  return parseMoneyInputToMinorUnits(item.price, STORE_CURRENCY_CODE) ?? 0
}

export const getCartLineTotalCents = (item: { readonly price: string; readonly qty: number; readonly rawPrice: number }): number =>
  getCartLineUnitPriceCents(item) * item.qty
