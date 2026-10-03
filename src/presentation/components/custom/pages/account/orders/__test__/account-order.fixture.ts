import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

export const PLACED_AT = new Date("2026-02-01T10:00:00.000Z")

export const SHIPPED_AT = new Date("2026-02-03T10:00:00.000Z")

export const DELIVERED_AT = new Date("2026-02-05T10:00:00.000Z")

export const buildAccountOrderItem = (overrides: Partial<CustomerAccount["orderItem"]> = {}): CustomerAccount["orderItem"] => ({
  id: "item-1",
  lineTotalMinorUnits: 24_000,
  name: "Silver ring",
  qty: 2,
  unitPriceMinorUnits: 12_000,
  ...overrides,
})

export const buildAccountOrderDetail = (overrides: Partial<CustomerAccount["orderDetail"]> = {}): CustomerAccount["orderDetail"] => ({
  createdAt: PLACED_AT,
  currencyCode: "PLN",
  discountMinorUnits: 0,
  filterStatus: "processing",
  fulfillmentStatus: "not_fulfilled",
  id: "a1b2c3d4-0000-0000-0000-000000000000",
  itemCount: 2,
  items: [buildAccountOrderItem()],
  orderNumber: "MRT-2026-00007",
  shippingMinorUnits: 1500,
  status: "processing",
  subtotalMinorUnits: 24_000,
  taxBasisPoints: 2300,
  taxMinorUnits: 4766,
  timeline: [{ date: PLACED_AT, event: "placed" }],
  totalMinorUnits: 25_500,
  ...overrides,
})
