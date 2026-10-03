import { describe, expect, it } from "vite-plus/test"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { DISCOUNT_CODE_MAX_LENGTH } from "~/src/modules/discount/discount.constants"

import {
  CHECKOUT_STEP_DEFINITIONS,
  CHECKOUT_STEP_ID,
  getFurthestReachableStepIndex,
} from "~/src/presentation/components/custom/checkout/lib/checkout-steps"

const CONTACT_INDEX = 0

const BILLING_INDEX = 1

const DELIVERY_INDEX = 2

const PAYMENT_INDEX = 3

const COMPLETE: CheckoutFormSchema = {
  address1: "Krucza 12/4",
  city: "Warszawa",
  countryCode: "PL",
  deliveryMethod: "courier-standard",
  email: "shopper@example.com",
  firstName: "Ada",
  lastName: "Kowalska",
  phone: "+48512345678",
  postalCode: "00-548",
}

describe("CHECKOUT_STEP_DEFINITIONS", () => {
  it("runs contact, then billing, then delivery, then payment", () => {
    expect(CHECKOUT_STEP_DEFINITIONS.map((step) => step.id)).toStrictEqual([
      CHECKOUT_STEP_ID.CONTACT,
      CHECKOUT_STEP_ID.BILLING,
      CHECKOUT_STEP_ID.DELIVERY,
      CHECKOUT_STEP_ID.PAYMENT,
    ])
  })

  it("leaves the payment step with no fields of its own to validate", () => {
    expect(CHECKOUT_STEP_DEFINITIONS[PAYMENT_INDEX]?.fields).toStrictEqual([])
  })
})

describe("getFurthestReachableStepIndex", () => {
  it("unlocks the payment step once the whole form is valid", () => {
    expect(getFurthestReachableStepIndex(COMPLETE)).toBe(PAYMENT_INDEX)
  })

  it("holds the shopper on contact while the email is malformed", () => {
    expect(getFurthestReachableStepIndex({ ...COMPLETE, email: "shopper@" })).toBe(CONTACT_INDEX)
  })

  it("holds the shopper on contact while the phone is not a mobile number", () => {
    expect(getFurthestReachableStepIndex({ ...COMPLETE, phone: "123" })).toBe(CONTACT_INDEX)
  })

  it("stops at contact rather than the later step when both are incomplete", () => {
    expect(getFurthestReachableStepIndex({ ...COMPLETE, deliveryMethod: "", email: "" })).toBe(CONTACT_INDEX)
  })

  it("unlocks billing once contact is valid but the address is missing", () => {
    expect(getFurthestReachableStepIndex({ ...COMPLETE, address1: "" })).toBe(BILLING_INDEX)
  })

  it("keeps the shopper on billing while the postal code does not match the country", () => {
    expect(getFurthestReachableStepIndex({ ...COMPLETE, postalCode: "00548" })).toBe(BILLING_INDEX)
  })

  it("keeps the shopper on billing while a separate billing address is incomplete", () => {
    expect(getFurthestReachableStepIndex({ ...COMPLETE, sameAsShipping: false })).toBe(BILLING_INDEX)
  })

  it.each([
    { field: "address2", limit: 512 },
    { field: "province", limit: 256 },
  ] as const)("validates the maximum length of optional $field before allowing payment", ({ field, limit }) => {
    expect(getFurthestReachableStepIndex({ ...COMPLETE, [field]: "a".repeat(limit) })).toBe(PAYMENT_INDEX)
    expect(getFurthestReachableStepIndex({ ...COMPLETE, [field]: "a".repeat(limit + 1) })).toBe(BILLING_INDEX)
  })

  it("does not hold the shopper on any step for a problem in a field no step asks for", () => {
    expect(getFurthestReachableStepIndex({ ...COMPLETE, discountCode: "X".repeat(DISCOUNT_CODE_MAX_LENGTH + 1) })).toBe(PAYMENT_INDEX)
  })

  it("unlocks delivery once the addresses are complete but no method is chosen", () => {
    expect(getFurthestReachableStepIndex({ ...COMPLETE, deliveryMethod: "" })).toBe(DELIVERY_INDEX)
  })

  it("keeps the shopper on delivery while a locker method has no locker", () => {
    expect(getFurthestReachableStepIndex({ ...COMPLETE, deliveryMethodType: "locker" })).toBe(DELIVERY_INDEX)
  })

  it("unlocks payment for a locker delivery once the locker is chosen", () => {
    expect(getFurthestReachableStepIndex({ ...COMPLETE, deliveryMethodType: "locker", lockerId: "WAW01A" })).toBe(PAYMENT_INDEX)
  })

  it("unlocks payment for a complete separate billing address", () => {
    expect(
      getFurthestReachableStepIndex({
        ...COMPLETE,
        billingAddress1: "Marszalkowska 1",
        billingCity: "Warszawa",
        billingCountryCode: "PL",
        billingFirstName: "Jan",
        billingLastName: "Nowak",
        billingPostalCode: "00-001",
        sameAsShipping: false,
      }),
    ).toBe(PAYMENT_INDEX)
  })
})
