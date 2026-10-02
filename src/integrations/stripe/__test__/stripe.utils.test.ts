import { describe, expect, it } from "vite-plus/test"

import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"

describe("resolveStripeObjectId", () => {
  it("returns an unexpanded reference as it is", () => {
    expect(resolveStripeObjectId("pi_test_1")).toBe("pi_test_1")
  })

  it("reads the id of an expanded object", () => {
    expect(resolveStripeObjectId({ id: "pi_test_1" })).toBe("pi_test_1")
  })

  it("returns undefined for an absent reference", () => {
    expect(resolveStripeObjectId(null)).toBeUndefined()
  })
})
