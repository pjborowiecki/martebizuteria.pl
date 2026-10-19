import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { type OrderTotals } from "~/src/modules/order/order.types"

export interface PrepareCreateCheckoutInput {
  readonly checkoutValues: CheckoutFormSchema
  readonly clientAddress: string
  readonly discountId?: string | undefined
  readonly lockerPoint?: string | undefined
  readonly lockerUnconfirmed?: boolean | undefined
  readonly userEmail: string
  readonly userId: string | undefined
}

export interface PendingCheckout {
  checkoutId: string
  email: string
  paymentId: string
  userId: string | null
}

export interface FulfillmentLine {
  handle?: string | undefined
  imageUrl?: string | undefined
  price: number
  qty: number
  title: string
  variantId: string
}

export interface ReleaseLine {
  qty: number
  variantId: string
}

export interface FulfillCheckoutInput {
  currency: string
  lines: FulfillmentLine[]
  locale?: string | undefined
  totals: OrderTotals
  transactionId: string
}

export interface CheckoutAddressSnapshot {
  readonly address1: string
  readonly address2?: string | null | undefined
  readonly city: string
  readonly countryCode: string
  readonly firstName?: string | null | undefined
  readonly lastName?: string | null | undefined
  readonly phone?: string | null | undefined
  readonly postalCode?: string | null | undefined
  readonly province?: string | null | undefined
}

export interface CheckoutFulfillmentSnapshot {
  readonly billingAddress?: CheckoutAddressSnapshot | null | undefined
  readonly billingCompanyName?: string | null | undefined
  readonly billingNip?: string | null | undefined
  readonly customerNote?: string | null | undefined
  readonly deliveryMethodId?: string | null | undefined
  readonly discountId?: string | null | undefined
  readonly lockerId?: string | null | undefined
  readonly lockerPoint?: string | null | undefined
  readonly lockerUnconfirmed?: boolean | undefined
  readonly shippingAddress?: CheckoutAddressSnapshot | null | undefined
}

export interface ReleaseCheckoutInput {
  lines: ReleaseLine[]
  transactionId: string
}
