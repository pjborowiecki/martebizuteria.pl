import { describe, expect, it, vi } from "vite-plus/test"

vi.mock("libphonenumber-js/mobile", () => ({
  isValidPhoneNumber: () => {
    throw new Error("metadata for country PL is missing")
  },
}))

import { type CheckoutFormSchema, checkoutSchema } from "~/src/modules/checkout/checkout.zod"

const SHIPPING: CheckoutFormSchema = {
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

describe("checkoutSchema phone validation when the parser fails", () => {
  it("rejects the phone instead of letting the parser failure escape", () => {
    const result = checkoutSchema.safeParse(SHIPPING)

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => `${issue.path.join(".")}:${issue.message}`)).toStrictEqual(["phone:validation.phoneInvalid"])
  })
})
