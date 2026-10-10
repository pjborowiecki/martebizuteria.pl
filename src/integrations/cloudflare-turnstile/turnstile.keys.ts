export const isTurnstileTestingKey = (key: string): boolean => TESTING_KEY_PATTERN.test(key)

const requiredKind = (environment: TurnstileKeysEnvironment): TurnstileKeyKind => (environment === "production" ? "widget" : "testing")

const keyKind = ({ name, role }: TurnstileKey, environment: TurnstileKeysEnvironment, value: string | undefined): TurnstileKeyKind => {
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} is missing for ${environment}. ${WHERE_TO_COPY[requiredKind(environment)](role)}`)
  }

  return isTurnstileTestingKey(value) ? "testing" : "widget"
}

export const verifyTurnstileKeys = ({ environment, secretKey, siteKey }: Readonly<TurnstileKeysCheck>): string => {
  const siteKeyKind = keyKind(SITE_KEY, environment, siteKey)
  const secretKeyKind = keyKind(SECRET_KEY, environment, secretKey)
  if (siteKeyKind !== secretKeyKind) {
    throw new Error(
      `${SITE_KEY.name} is a ${siteKeyKind} key but ${SECRET_KEY.name} is a ${secretKeyKind} key, so the server would refuse every token the widget issues and no customer could open a checkout. ${WHERE_TO_COPY[requiredKind(environment)](BOTH_KEYS)}`,
    )
  }

  if (environment === "production" && siteKeyKind === "testing") {
    throw new Error(
      `production needs the keys of the shop's own Turnstile widget, but ${SITE_KEY.name} and ${SECRET_KEY.name} are Cloudflare's testing keys, which pass every visitor, bots included. ${WHERE_TO_COPY.widget(BOTH_KEYS)}`,
    )
  }

  return `${SITE_KEY.name} and ${SECRET_KEY.name} are ${siteKeyKind} Turnstile keys, as ${environment} allows.`
}

interface TurnstileKey {
  readonly name: "TURNSTILE_SECRET_KEY" | "VITE_TURNSTILE_SITE_KEY"
  readonly role: "secret key" | "site key"
}

interface TurnstileKeysCheck {
  readonly environment: TurnstileKeysEnvironment
  readonly secretKey: string | undefined
  readonly siteKey: string | undefined
}

type TurnstileKeysEnvironment = "development" | "preview" | "production"

type TurnstileKeyKind = "testing" | "widget"

const TESTING_KEY_PATTERN = /^[123]x0+[A-F]{2}$/u

const BOTH_KEYS = "site and secret keys"

const WHERE_TO_COPY = {
  testing: (keys: string) =>
    `Use Cloudflare's always-passing testing ${keys} from https://developers.cloudflare.com/turnstile/troubleshooting/testing/.`,
  widget: (keys: string) => `Copy the ${keys} of the shop's widget from https://dash.cloudflare.com/?to=/:account/turnstile.`,
} as const satisfies Record<TurnstileKeyKind, (keys: string) => string>

const SITE_KEY: TurnstileKey = { name: "VITE_TURNSTILE_SITE_KEY", role: "site key" }

const SECRET_KEY: TurnstileKey = { name: "TURNSTILE_SECRET_KEY", role: "secret key" }
