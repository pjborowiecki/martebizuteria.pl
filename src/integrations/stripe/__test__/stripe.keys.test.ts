import { describe, expect, it } from "vite-plus/test"

import { requiredStripeMode, verifyStripeKeys } from "~/src/integrations/stripe/stripe.keys"

const FIXTURE_SUFFIX = "local_fixture"

const LIVE_PUBLISHABLE_KEY = `pk_live_${FIXTURE_SUFFIX}`

const LIVE_SECRET_KEY = `sk_live_${FIXTURE_SUFFIX}`

const LIVE_RESTRICTED_KEY = `rk_live_${FIXTURE_SUFFIX}`

const TEST_PUBLISHABLE_KEY = `pk_test_${FIXTURE_SUFFIX}`

const TEST_SECRET_KEY = `sk_test_${FIXTURE_SUFFIX}`

const TEST_RESTRICTED_KEY = `rk_test_${FIXTURE_SUFFIX}`

const WEBHOOK_SECRET = `whsec_${FIXTURE_SUFFIX}`

const keys = (overrides: Partial<Parameters<typeof verifyStripeKeys>[0]> = {}): Parameters<typeof verifyStripeKeys>[0] => ({
  environment: "production",
  publishableKey: LIVE_PUBLISHABLE_KEY,
  secretKey: LIVE_SECRET_KEY,
  ...overrides,
})

describe("verifyStripeKeys for production", () => {
  it("accepts a live publishable key with a live secret or restricted key", () => {
    expect(verifyStripeKeys(keys())).toBe("VITE_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY are live Stripe keys, as production needs.")
    expect(verifyStripeKeys(keys({ secretKey: LIVE_RESTRICTED_KEY }))).toBe(
      "VITE_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY are live Stripe keys, as production needs.",
    )
  })

  it("refuses test keys, which would take Stripe's test cards as real payments", () => {
    expect(() => verifyStripeKeys(keys({ publishableKey: TEST_PUBLISHABLE_KEY, secretKey: TEST_SECRET_KEY }))).toThrow(
      new Error(
        "production needs live Stripe keys, but VITE_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY are test keys, so checkout would accept Stripe's test cards and no payment would reach the shop. Copy the live keys from https://dashboard.stripe.com/apikeys.",
      ),
    )
    expect(() => verifyStripeKeys(keys({ publishableKey: TEST_PUBLISHABLE_KEY, secretKey: TEST_RESTRICTED_KEY }))).toThrow(
      "production needs live Stripe keys",
    )
  })

  it("points at the live dashboard page when a key is missing", () => {
    expect(() => verifyStripeKeys(keys({ publishableKey: undefined }))).toThrow(
      new Error(
        "VITE_STRIPE_PUBLISHABLE_KEY is missing for production. Copy the publishable key from https://dashboard.stripe.com/apikeys.",
      ),
    )
    expect(() => verifyStripeKeys(keys({ secretKey: undefined }))).toThrow(
      new Error("STRIPE_SECRET_KEY is missing for production. Copy the secret key from https://dashboard.stripe.com/apikeys."),
    )
  })
})

describe.each(["development", "preview"] as const)("verifyStripeKeys for %s", (environment) => {
  it("accepts a test publishable key with a test secret or restricted key", () => {
    expect(verifyStripeKeys(keys({ environment, publishableKey: TEST_PUBLISHABLE_KEY, secretKey: TEST_SECRET_KEY }))).toBe(
      `VITE_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY are test Stripe keys, as ${environment} needs.`,
    )
    expect(verifyStripeKeys(keys({ environment, publishableKey: TEST_PUBLISHABLE_KEY, secretKey: TEST_RESTRICTED_KEY }))).toBe(
      `VITE_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY are test Stripe keys, as ${environment} needs.`,
    )
  })

  it("refuses live keys, which would charge real cards for test orders", () => {
    expect(() => verifyStripeKeys(keys({ environment }))).toThrow(
      new Error(
        `${environment} needs test Stripe keys, but VITE_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY are live keys, so a test order would charge a real card. Copy the test keys from https://dashboard.stripe.com/test/apikeys.`,
      ),
    )
    expect(() => verifyStripeKeys(keys({ environment, secretKey: LIVE_RESTRICTED_KEY }))).toThrow(`${environment} needs test Stripe keys`)
  })

  it("points at the test dashboard page when a key is missing", () => {
    expect(() => verifyStripeKeys(keys({ environment, publishableKey: undefined, secretKey: TEST_SECRET_KEY }))).toThrow(
      new Error(
        `VITE_STRIPE_PUBLISHABLE_KEY is missing for ${environment}. Copy the publishable key from https://dashboard.stripe.com/test/apikeys.`,
      ),
    )
    expect(() => verifyStripeKeys(keys({ environment, publishableKey: TEST_PUBLISHABLE_KEY, secretKey: undefined }))).toThrow(
      new Error(`STRIPE_SECRET_KEY is missing for ${environment}. Copy the secret key from https://dashboard.stripe.com/test/apikeys.`),
    )
  })
})

describe.each(["development", "preview", "production"] as const)("verifyStripeKeys key pairs for %s", (environment) => {
  it("refuses a publishable key whose mode differs from the secret key's", () => {
    const dashboard = environment === "production" ? "https://dashboard.stripe.com/apikeys" : "https://dashboard.stripe.com/test/apikeys"

    expect(() => verifyStripeKeys(keys({ environment, publishableKey: TEST_PUBLISHABLE_KEY, secretKey: LIVE_SECRET_KEY }))).toThrow(
      new Error(
        `VITE_STRIPE_PUBLISHABLE_KEY is a test key but STRIPE_SECRET_KEY is a live key, so the payment form could not open the Checkout Sessions the server creates. Copy both keys from ${dashboard}.`,
      ),
    )
    expect(() => verifyStripeKeys(keys({ environment, publishableKey: LIVE_PUBLISHABLE_KEY, secretKey: TEST_RESTRICTED_KEY }))).toThrow(
      "VITE_STRIPE_PUBLISHABLE_KEY is a live key but STRIPE_SECRET_KEY is a test key",
    )
  })

  it("refuses a blank key before reading its mode", () => {
    expect(() => verifyStripeKeys(keys({ environment, publishableKey: "" }))).toThrow(
      `VITE_STRIPE_PUBLISHABLE_KEY is missing for ${environment}.`,
    )
    expect(() => verifyStripeKeys(keys({ environment, secretKey: "  " }))).toThrow(`STRIPE_SECRET_KEY is missing for ${environment}.`)
  })

  it("refuses a value that is not the kind of key its variable holds", () => {
    expect(() => verifyStripeKeys(keys({ environment, publishableKey: LIVE_SECRET_KEY }))).toThrow(
      new Error(
        `VITE_STRIPE_PUBLISHABLE_KEY for ${environment} is not a Stripe publishable key. It must start with one of pk_live_, pk_test_.`,
      ),
    )
    expect(() => verifyStripeKeys(keys({ environment, secretKey: LIVE_PUBLISHABLE_KEY }))).toThrow(
      new Error(
        `STRIPE_SECRET_KEY for ${environment} is not a Stripe secret key. It must start with one of sk_live_, rk_live_, sk_test_, rk_test_.`,
      ),
    )
    expect(() => verifyStripeKeys(keys({ environment, secretKey: WEBHOOK_SECRET }))).toThrow("is not a Stripe secret key")
    expect(() => verifyStripeKeys(keys({ environment, publishableKey: ` ${LIVE_PUBLISHABLE_KEY}` }))).toThrow(
      "is not a Stripe publishable key",
    )
  })
})

describe("verifyStripeKeys output", () => {
  it("names the keys' mode and never the keys themselves", () => {
    expect(verifyStripeKeys(keys())).not.toContain(FIXTURE_SUFFIX)
  })

  it.each([
    { publishableKey: TEST_PUBLISHABLE_KEY, secretKey: TEST_SECRET_KEY },
    { environment: "preview" as const },
    { publishableKey: TEST_PUBLISHABLE_KEY },
    { publishableKey: LIVE_SECRET_KEY },
    { secretKey: WEBHOOK_SECRET },
  ])("leaves the keys out of the refusal for %o", (overrides) => {
    expect(() => verifyStripeKeys(keys(overrides))).toThrow(Error)
    expect(() => verifyStripeKeys(keys(overrides))).not.toThrow(FIXTURE_SUFFIX)
  })
})

describe("requiredStripeMode", () => {
  it("runs production in live mode", () => {
    expect(requiredStripeMode("production")).toBe("live")
  })

  it.each(["development", "preview", "test"])("runs %s in test mode", (environment) => {
    expect(requiredStripeMode(environment)).toBe("test")
  })
})
