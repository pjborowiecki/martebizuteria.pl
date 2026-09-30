import { type Order } from "~/src/modules/order/order.types"

export const PLACED_AT = new Date("2026-03-04T09:15:00.000Z")

export const SHIPPED_AT = new Date("2026-03-06T11:40:00.000Z")

export const ORDER_ID = "a1b2c3d4-0000-0000-0000-000000000000"

export const SHIPPING_ADDRESS: Order["adminOrderDetailAddress"] = {
  city: "Warszawa",
  countryCode: "PL",
  line1: "ul. Mokotowska 12/4",
  line2: undefined,
  name: "Anna Kowalska",
  phone: "+48 600 123 456",
  postalCode: "00-640",
  province: undefined,
}

export const ORDER_ITEM: Order["adminOrderDetailItem"] = {
  id: "item-1",
  imageUrl: undefined,
  productHandle: "aura-hoop",
  quantity: 2,
  sku: "AUR-HP-001-GD",
  title: "Aura Hoop I",
  totalMinorUnits: 37_000,
  unitPriceMinorUnits: 18_500,
  variantTitle: "18k Gold / Medium",
}

export const buildAdminOrderDetail = (overrides: Partial<Order["adminOrderDetail"]> = {}): Order["adminOrderDetail"] => ({
  billingAddress: SHIPPING_ADDRESS,
  billingSameAsShipping: true,
  canceledAt: undefined,
  createdAt: PLACED_AT,
  currencyCode: "PLN",
  customer: {
    email: "anna@example.com",
    initials: "AK",
    name: "Anna Kowalska",
    orderCount: 3,
    phone: "+48 600 123 456",
    totalSpentMinorUnits: 120_000,
    userId: "user-1",
  },
  customerNote: "Please gift wrap.",
  deliveredAt: undefined,
  delivery: {
    courierName: "InPost",
    lockerId: "WAW01A",
    methodName: "Paczkomat 24/7",
    type: "locker",
  },
  discountTotalMinorUnits: 0,
  displayId: "#A1B2C3D4",
  dispute: undefined,
  fulfillmentStatus: "shipped",
  fulfillmentSteps: [
    { at: PLACED_AT, done: true, key: "confirmed" },
    { at: PLACED_AT, done: true, key: "processing" },
    { at: SHIPPED_AT, done: true, key: "shipped" },
    { at: undefined, done: false, key: "delivered" },
  ],
  fulfillmentUiKey: "shipped",
  id: ORDER_ID,
  items: [ORDER_ITEM],
  payment: {
    amountMinorUnits: 38_900,
    provider: "stripe",
    refundedAmountMinorUnits: 0,
    refundedAt: undefined,
    status: "succeeded",
    transactionId: "pi_3Ns8wK2eZvKY",
  },
  paymentUiKey: "paid",
  shippedAt: SHIPPED_AT,
  shippingAddress: SHIPPING_ADDRESS,
  shippingTotalMinorUnits: 1900,
  status: "processing",
  subtotalMinorUnits: 37_000,
  tags: ["returning", "locker"],
  taxTotalMinorUnits: 0,
  timeline: [
    {
      actorName: "System",
      at: SHIPPED_AT,
      detail: "00259007123456789012",
      emailStatus: undefined,
      id: "audit-2",
      kind: "shipping",
      labelKey: "shipped",
      severity: "success",
    },
    {
      actorName: "System",
      at: PLACED_AT,
      detail: undefined,
      emailStatus: "sent",
      id: "audit-1",
      kind: "email",
      labelKey: "emailSent",
      severity: "success",
    },
  ],
  totalMinorUnits: 38_900,
  trackingNumber: "00259007123456789012",
  trackingUrl: "https://inpost.pl/sledzenie-przesylek?number=00259007123456789012",
  ...overrides,
})
