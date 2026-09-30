import { type Discount } from "~/src/modules/discount/discount.types"

export const buildCoupon = (overrides: Partial<Discount["adminListItem"]> = {}): Discount["adminListItem"] => ({
  code: "SPRING20",
  description: "Spring campaign",
  endsAt: new Date("2026-06-30T22:00:00.000Z"),
  id: "a1b2c3d4-0000-0000-0000-000000000001",
  isActive: true,
  maxDiscountAmountMinorUnits: undefined,
  minOrderTotalMinorUnits: 20_000,
  perCustomerLimit: 1,
  startsAt: undefined,
  status: "active",
  type: "percentage",
  usageCount: 12,
  usageLimit: 100,
  value: 20,
  ...overrides,
})

export const buildStats = (overrides: Partial<Discount["adminStats"]> = {}): Discount["adminStats"] => ({
  active: 3,
  currencyCode: "PLN",
  redeemedTotalMinorUnits: 124_500,
  redemptions: 42,
  total: 7,
  ...overrides,
})
