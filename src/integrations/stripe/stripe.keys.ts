const requiredMode = (environment: StripeKeysEnvironment): StripeMode => (environment === "production" ? "live" : "test")

const keyMode = ({ name, prefixes, role }: StripeKey, environment: StripeKeysEnvironment, value: string | undefined): StripeMode => {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is missing for ${environment}. Copy the ${role} key from ${API_KEYS_PAGE[requiredMode(environment)]}.`)
  }

  const mode = STRIPE_MODES.find((candidate) => prefixes[candidate].some((prefix) => value.startsWith(prefix)))
  if (mode === undefined) {
    throw new Error(
      `${name} for ${environment} is not a Stripe ${role} key. It must start with one of ${[...prefixes.live, ...prefixes.test].join(", ")}.`,
    )
  }

  return mode
}

export const verifyStripeKeys = ({ environment, publishableKey, secretKey }: Readonly<StripeKeysCheck>): string => {
  const required = requiredMode(environment)
  const publishableMode = keyMode(PUBLISHABLE_KEY, environment, publishableKey)
  const secretMode = keyMode(SECRET_KEY, environment, secretKey)
  if (publishableMode !== secretMode) {
    throw new Error(
      `${PUBLISHABLE_KEY.name} is a ${publishableMode} key but ${SECRET_KEY.name} is a ${secretMode} key, so the payment form could not open the Checkout Sessions the server creates. Copy both keys from ${API_KEYS_PAGE[required]}.`,
    )
  }

  if (publishableMode !== required) {
    throw new Error(
      `${environment} needs ${required} Stripe keys, but ${PUBLISHABLE_KEY.name} and ${SECRET_KEY.name} are ${publishableMode} keys, ${WRONG_MODE_RISK[required]} Copy the ${required} keys from ${API_KEYS_PAGE[required]}.`,
    )
  }

  return `${PUBLISHABLE_KEY.name} and ${SECRET_KEY.name} are ${required} Stripe keys, as ${environment} needs.`
}

interface StripeKey {
  readonly name: "STRIPE_SECRET_KEY" | "VITE_STRIPE_PUBLISHABLE_KEY"
  readonly prefixes: Readonly<Record<StripeMode, readonly string[]>>
  readonly role: "publishable" | "secret"
}

interface StripeKeysCheck {
  readonly environment: StripeKeysEnvironment
  readonly publishableKey: string | undefined
  readonly secretKey: string | undefined
}

type StripeKeysEnvironment = "development" | "preview" | "production"

type StripeMode = (typeof STRIPE_MODES)[number]

const STRIPE_MODES = ["live", "test"] as const

const API_KEYS_PAGE = {
  live: "https://dashboard.stripe.com/apikeys",
  test: "https://dashboard.stripe.com/test/apikeys",
} as const satisfies Record<StripeMode, string>

const WRONG_MODE_RISK = {
  live: "so checkout would accept Stripe's test cards and no payment would reach the shop.",
  test: "so a test order would charge a real card.",
} as const satisfies Record<StripeMode, string>

const PUBLISHABLE_KEY: StripeKey = {
  name: "VITE_STRIPE_PUBLISHABLE_KEY",
  prefixes: { live: ["pk_live_"], test: ["pk_test_"] },
  role: "publishable",
}

const SECRET_KEY: StripeKey = {
  name: "STRIPE_SECRET_KEY",
  prefixes: { live: ["sk_live_", "rk_live_"], test: ["sk_test_", "rk_test_"] },
  role: "secret",
}
