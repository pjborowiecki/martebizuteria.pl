import { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { loadStripe } = vi.hoisted(() => ({ loadStripe: vi.fn<() => Promise<null>>(() => Promise.resolve(null)) }))

vi.mock("@stripe/stripe-js", () => ({ loadStripe }))

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

const importGetStripe = async () => {
  const module = await import("~/src/integrations/stripe/stripe.client")

  return module.getStripe
}

describe("getStripe", () => {
  beforeEach(() => {
    vi.resetModules()
    loadStripe.mockClear()
  })

  it("loads Stripe with the publishable key from the environment", async () => {
    const getStripe = await importGetStripe()

    await getStripe()

    expect(loadStripe).toHaveBeenCalledWith("pk_test_local_fixture", undefined)
  })

  it("maps the app locale to the Stripe element locale", async () => {
    const getStripe = await importGetStripe()

    await getStripe("pl-PL")

    expect(loadStripe).toHaveBeenCalledWith("pk_test_local_fixture", { locale: "pl" })
  })

  it("maps the English locale to Stripe's short code", async () => {
    const getStripe = await importGetStripe()

    await getStripe("en-US")

    expect(loadStripe).toHaveBeenCalledWith("pk_test_local_fixture", { locale: "en" })
  })

  it("lets Stripe detect the locale when the app locale is not supported", async () => {
    const getStripe = await importGetStripe()

    await getStripe("de-DE")

    expect(loadStripe).toHaveBeenCalledWith("pk_test_local_fixture", { locale: "auto" })
  })

  it("loads Stripe once and reuses the same promise for later calls", async () => {
    const getStripe = await importGetStripe()

    const first = getStripe("pl-PL")
    const second = getStripe("en-US")

    expect(first).toBe(second)
    expect(loadStripe).toHaveBeenCalledTimes(1)
    await expect(first).resolves.toBeNull()
  })

  it("keeps the locale of the first call, since the SDK cannot be reloaded", async () => {
    const getStripe = await importGetStripe()

    await getStripe("pl-PL")
    await getStripe("en-US")

    expect(loadStripe).toHaveBeenCalledExactlyOnceWith("pk_test_local_fixture", { locale: "pl" })
  })

  it("downloads Stripe.js again on the next call after a failed download", async () => {
    const failure = new Error("Failed to load Stripe.js")
    loadStripe.mockRejectedValueOnce(failure)
    const getStripe = await importGetStripe()

    await expect(getStripe("pl-PL")).rejects.toBe(failure)
    await expect(getStripe("pl-PL")).resolves.toBeNull()

    expect(loadStripe).toHaveBeenCalledTimes(2)
  })
})

describe("stripeJsQuery", () => {
  beforeEach(() => {
    vi.resetModules()
    loadStripe.mockClear()
  })

  it("loads Stripe.js once per locale, never retries on its own and never goes stale", async () => {
    const { stripeJsQuery } = await import("~/src/integrations/stripe/stripe.client")
    const query = stripeJsQuery("pl-PL")

    expect(query).toMatchObject({ queryKey: ["stripe", "js", "pl-PL"], retry: false, staleTime: "static" })
    await expect(new QueryClient().query(query)).resolves.toBeNull()
    expect(loadStripe).toHaveBeenCalledExactlyOnceWith("pk_test_local_fixture", { locale: "pl" })
  })
})

describe("getStripe without a publishable key", () => {
  beforeEach(() => {
    vi.resetModules()
    loadStripe.mockClear()
  })

  it.each(["", undefined])("warns for the missing publishable key %j and passes an empty key to the SDK", async (key) => {
    vi.stubEnv("VITE_STRIPE_PUBLISHABLE_KEY", key)
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const getStripe = await importGetStripe()

    await getStripe()

    expect(warn).toHaveBeenCalledWith("VITE_STRIPE_PUBLISHABLE_KEY is missing. Stripe will not initialize.")
    expect(loadStripe).toHaveBeenCalledWith("", undefined)
    warn.mockRestore()
    vi.unstubAllEnvs()
  })
})

describe("toStripeLocale", () => {
  it.each([
    ["pl-PL", "pl"],
    ["en-US", "en"],
    ["de-DE", "auto"],
  ])("maps %s to the Stripe locale %s, and any other locale to auto", async (locale, expected) => {
    const { toStripeLocale } = await import("~/src/integrations/stripe/stripe.client")

    expect(toStripeLocale(locale)).toBe(expected)
  })
})
