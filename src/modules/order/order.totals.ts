import { STANDARD_VAT_BASIS_POINTS } from "~/src/modules/_core/constants/tax"
import { vatFromGross } from "~/src/modules/_core/utils/tax"

const NO_AMOUNT = 0

export const sumOrderLineSubtotal = (lines: readonly OrderTotalsLine[]): number =>
  lines.reduce((sum, line) => sum + line.price * line.qty, NO_AMOUNT)

/**
 * Catalogue prices are gross, so VAT is carved out of the payable total rather
 * than added on top. Every amount here is authoritative: nothing downstream may
 * infer one component by subtracting the others.
 */
export const computeOrderTotals = ({
  discountTotal = NO_AMOUNT,
  itemsSubtotal,
  shippingTotal,
  vatBasisPoints = STANDARD_VAT_BASIS_POINTS,
}: OrderTotalsInput): OrderTotals => {
  const cappedDiscount = Math.min(Math.max(discountTotal, NO_AMOUNT), itemsSubtotal + shippingTotal)
  const total = itemsSubtotal + shippingTotal - cappedDiscount

  return {
    discountTotal: cappedDiscount,
    shippingTotal,
    subtotal: itemsSubtotal,
    taxTotal: vatFromGross(total, vatBasisPoints),
    total,
    vatBasisPoints,
  }
}

export interface OrderTotalsLine {
  readonly price: number
  readonly qty: number
}

export interface OrderTotalsInput {
  readonly discountTotal?: number | undefined
  readonly itemsSubtotal: number
  readonly shippingTotal: number
  readonly vatBasisPoints?: number | undefined
}

export interface OrderTotals {
  readonly discountTotal: number
  readonly shippingTotal: number
  readonly subtotal: number
  readonly taxTotal: number
  readonly total: number
  readonly vatBasisPoints: number
}
