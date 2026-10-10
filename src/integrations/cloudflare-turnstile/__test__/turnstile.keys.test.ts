import { describe, expect, it } from "vite-plus/test"

import { TURNSTILE_TESTING_KEYS } from "~/src/integrations/cloudflare-turnstile/turnstile.constants"
import { isTurnstileTestingKey, verifyTurnstileKeys } from "~/src/integrations/cloudflare-turnstile/turnstile.keys"

const WIDGET_SITE_KEY = "0x4AAAAAAAlocal_fixture"

const WIDGET_SECRET_KEY = "0x4AAAAAAAlocal_fixture_secret"

const TESTING_SITE_KEY = TURNSTILE_TESTING_KEYS.ALWAYS_PASSES_SITE_KEY

const TESTING_SECRET_KEY = TURNSTILE_TESTING_KEYS.ALWAYS_PASSES_SECRET_KEY

const WIDGET_DASHBOARD = "https://dash.cloudflare.com/?to=/:account/turnstile"

const TESTING_KEYS_PAGE = "https://developers.cloudflare.com/turnstile/troubleshooting/testing/"

const keys = (overrides: Partial<Parameters<typeof verifyTurnstileKeys>[0]> = {}): Parameters<typeof verifyTurnstileKeys>[0] => ({
  environment: "production",
  secretKey: WIDGET_SECRET_KEY,
  siteKey: WIDGET_SITE_KEY,
  ...overrides,
})

describe("isTurnstileTestingKey", () => {
  it.each([
    "1x00000000000000000000AA",
    "2x00000000000000000000AB",
    "1x00000000000000000000BB",
    "3x00000000000000000000FF",
    "1x0000000000000000000000000000000AA",
    "2x0000000000000000000000000000000AA",
    "3x0000000000000000000000000000000AA",
  ])("recognises Cloudflare's testing key %s", (key) => {
    expect(isTurnstileTestingKey(key)).toBe(true)
  })

  it("does not take a widget's own key for a testing key", () => {
    expect(isTurnstileTestingKey(WIDGET_SITE_KEY)).toBe(false)
    expect(isTurnstileTestingKey(WIDGET_SECRET_KEY)).toBe(false)
  })
})

describe("verifyTurnstileKeys for production", () => {
  it("accepts the keys of the shop's own widget", () => {
    expect(verifyTurnstileKeys(keys())).toBe(
      "VITE_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are widget Turnstile keys, as production allows.",
    )
  })

  it("refuses Cloudflare's testing keys, which would let every bot through", () => {
    expect(() => verifyTurnstileKeys(keys({ secretKey: TESTING_SECRET_KEY, siteKey: TESTING_SITE_KEY }))).toThrow(
      new Error(
        `production needs the keys of the shop's own Turnstile widget, but VITE_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are Cloudflare's testing keys, which pass every visitor, bots included. Copy the site and secret keys of the shop's widget from ${WIDGET_DASHBOARD}.`,
      ),
    )
  })

  it("points at the widget in the dashboard when a key is missing", () => {
    expect(() => verifyTurnstileKeys(keys({ siteKey: undefined }))).toThrow(
      new Error(`VITE_TURNSTILE_SITE_KEY is missing for production. Copy the site key of the shop's widget from ${WIDGET_DASHBOARD}.`),
    )
    expect(() => verifyTurnstileKeys(keys({ secretKey: " " }))).toThrow(
      new Error(`TURNSTILE_SECRET_KEY is missing for production. Copy the secret key of the shop's widget from ${WIDGET_DASHBOARD}.`),
    )
  })
})

describe.each(["development", "preview"] as const)("verifyTurnstileKeys for %s", (environment) => {
  it("accepts Cloudflare's testing keys", () => {
    expect(verifyTurnstileKeys(keys({ environment, secretKey: TESTING_SECRET_KEY, siteKey: TESTING_SITE_KEY }))).toBe(
      `VITE_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are testing Turnstile keys, as ${environment} allows.`,
    )
  })

  it("accepts a widget's own keys too", () => {
    expect(verifyTurnstileKeys(keys({ environment }))).toBe(
      `VITE_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are widget Turnstile keys, as ${environment} allows.`,
    )
  })

  it("points at the testing keys when a key is missing", () => {
    expect(() => verifyTurnstileKeys(keys({ environment, secretKey: TESTING_SECRET_KEY, siteKey: "" }))).toThrow(
      new Error(
        `VITE_TURNSTILE_SITE_KEY is missing for ${environment}. Use Cloudflare's always-passing testing site key from ${TESTING_KEYS_PAGE}.`,
      ),
    )
  })
})

describe.each(["development", "preview", "production"] as const)("verifyTurnstileKeys key pairs for %s", (environment) => {
  it("refuses a testing site key with a widget's secret key, which would refuse every checkout", () => {
    const whereToCopy =
      environment === "production"
        ? `Copy the site and secret keys of the shop's widget from ${WIDGET_DASHBOARD}.`
        : `Use Cloudflare's always-passing testing site and secret keys from ${TESTING_KEYS_PAGE}.`

    expect(() => verifyTurnstileKeys(keys({ environment, siteKey: TESTING_SITE_KEY }))).toThrow(
      new Error(
        `VITE_TURNSTILE_SITE_KEY is a testing key but TURNSTILE_SECRET_KEY is a widget key, so the server would refuse every token the widget issues and no customer could open a checkout. ${whereToCopy}`,
      ),
    )
    expect(() => verifyTurnstileKeys(keys({ environment, secretKey: TESTING_SECRET_KEY }))).toThrow(
      "VITE_TURNSTILE_SITE_KEY is a widget key but TURNSTILE_SECRET_KEY is a testing key",
    )
  })
})

describe("verifyTurnstileKeys output", () => {
  it("names the kind of keys and never the keys themselves", () => {
    expect(verifyTurnstileKeys(keys())).not.toContain(WIDGET_SECRET_KEY)
    expect(() => verifyTurnstileKeys(keys({ siteKey: TESTING_SITE_KEY }))).not.toThrow(WIDGET_SECRET_KEY)
  })
})
