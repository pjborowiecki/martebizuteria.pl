import StripeServer from "stripe"
import { describe, expect, it, vi } from "vite-plus/test"

vi.mock("cloudflare:workers", () => ({ env: { STRIPE_SECRET_KEY: "sk_test_server_client" } }))

import { STRIPE_API_VERSION } from "~/src/integrations/stripe/stripe.constants"
import { stripe } from "~/src/integrations/stripe/stripe.server"

import { APP_NAME } from "~/src/presentation/branding/app"

describe("stripe server client", () => {
  it("pins the api version the integration was written against", () => {
    expect(stripe.getApiField("version")).toBe(STRIPE_API_VERSION)
  })

  it("identifies the store in the client user agent", () => {
    const seen: { agent?: string } = {}
    stripe.getClientUserAgent((agent) => {
      seen.agent = agent
    })

    expect(seen.agent).toContain(APP_NAME)
  })

  it("talks to the live stripe api host", () => {
    expect(stripe.getApiField("host")).toBe("api.stripe.com")
  })

  it("talks to stripe over fetch so it can run on workers", () => {
    const client: unknown = stripe.getApiField("httpClient")
    const fetchClient: unknown = StripeServer.createFetchHttpClient()

    expect(client).toBeInstanceOf(StripeServer.HttpClient)
    expect(Object.getPrototypeOf(client)).toBe(Object.getPrototypeOf(fetchClient))
  })

  it("exposes the resources the checkout flow needs", () => {
    expect(typeof stripe.checkout.sessions.create).toBe("function")
    expect(typeof stripe.webhooks.constructEventAsync).toBe("function")
  })
})
