import { type payment } from "~/src/modules/payment/payment.schema"

interface SavedPaymentMethod {
  readonly brand: string
  readonly expMonth: number
  readonly expYear: number
  readonly id: string
  readonly isExpired: boolean
  readonly last4: string
}

export interface Payment {
  insert: typeof payment.$inferInsert
  savedMethod: SavedPaymentMethod
  select: typeof payment.$inferSelect
}
