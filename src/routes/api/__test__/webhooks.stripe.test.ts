import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

interface RouteDefinition {
  readonly server: {
    readonly handlers: {
      readonly GET: () => Response
      readonly POST: (context: { readonly request: Request }) => Promise<Response>
    }
  }
}

const captured: { current: RouteDefinition | undefined } = { current: undefined }

const env = { STRIPE_WEBHOOK_SECRET: "whsec_test" }

const constructEventAsync = vi.fn<(body: string, signature: string, secret: string) => Promise<{ id: string; type: string }>>()

const handledEvent = vi.fn<(event: { id: string; type: string }) => Promise<void>>()

const notifyShopOfIncident = vi.fn<(incident: { detail: string; kind: string; reference: string }) => Promise<void>>()

const webhookHandlers: Record<string, (event: { id: string; type: string }) => Promise<void>> = {
  "checkout.session.completed": handledEvent,
}

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: RouteDefinition) => {
    captured.current = options

    return options
  },
}))
vi.mock("~/src/integrations/resend/incident-alert.notification.server", () => ({ notifyShopOfIncident }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { webhooks: { constructEventAsync } } }))
vi.mock("~/src/integrations/stripe/stripe.webhooks", () => ({ webhookHandlers }))

await import("~/src/routes/api/webhooks.stripe")

const route = captured.current

if (route === undefined) {
  throw new Error("the stripe webhook route did not register a handler")
}

const postWebhook = route.server.handlers.POST

const webhookRequest = (signature?: string): Request =>
  new Request("https://store.test/api/webhooks/stripe", {
    body: JSON.stringify({ id: "evt_1" }),
    headers: signature === undefined ? {} : { "stripe-signature": signature },
    method: "POST",
  })

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

beforeEach(() => {
  vi.clearAllMocks()
  env.STRIPE_WEBHOOK_SECRET = "whsec_test"
  notifyShopOfIncident.mockResolvedValue(undefined)
})

describe("stripe webhook route", () => {
  it("answers a GET with 405 and names POST as the method it takes, without asking stripe", async () => {
    const response = route.server.handlers.GET()

    expect(response.status).toBe(HTTP_STATUS.METHOD_NOT_ALLOWED)
    expect(response.headers.get("Allow")).toBe("POST")
    await expect(response.text()).resolves.toBe("Method Not Allowed")
    expect(constructEventAsync).not.toHaveBeenCalled()
  })

  it("rejects a request that carries no stripe signature", async () => {
    const response = await postWebhook({ request: webhookRequest() })

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    await expect(response.text()).resolves.toBe("Missing signature or webhook secret")
    expect(constructEventAsync).not.toHaveBeenCalled()
  })

  it("rejects a signed request while the webhook secret is unset", async () => {
    env.STRIPE_WEBHOOK_SECRET = ""

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    expect(constructEventAsync).not.toHaveBeenCalled()
  })

  it("rejects a request whose signature stripe refuses to verify", async () => {
    constructEventAsync.mockRejectedValue(new Error("no signatures found matching the expected signature"))

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    await expect(response.text()).resolves.toBe("Webhook Error: Invalid Signature")
  })

  it("verifies the raw body against the signature and the configured secret", async () => {
    constructEventAsync.mockResolvedValue({ id: "evt_1", type: "checkout.session.completed" })
    handledEvent.mockResolvedValue(undefined)

    await postWebhook({ request: webhookRequest("sig_1") })

    expect(constructEventAsync).toHaveBeenCalledWith(JSON.stringify({ id: "evt_1" }), "sig_1", "whsec_test")
  })

  it("runs the handler registered for the event type and acknowledges it", async () => {
    const event = { id: "evt_1", type: "checkout.session.completed" }
    constructEventAsync.mockResolvedValue(event)
    handledEvent.mockResolvedValue(undefined)

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(handledEvent).toHaveBeenCalledWith(event)
    await expect(response.json()).resolves.toStrictEqual({ received: true })
    expect(notifyShopOfIncident).not.toHaveBeenCalled()
  })

  it("acknowledges an event nobody handles instead of failing the delivery", async () => {
    constructEventAsync.mockResolvedValue({ id: "evt_2", type: "invoice.paid" })

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(handledEvent).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ received: true })
  })

  it("asks stripe to retry when the domain handler throws", async () => {
    constructEventAsync.mockResolvedValue({ id: "evt_1", type: "checkout.session.completed" })
    handledEvent.mockRejectedValue(new Error("inventory compensation failed"))

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    await expect(response.text()).resolves.toBe("Internal Server Error")
    expect(consoleError).toHaveBeenCalledWith("[Stripe] Domain logic failed for checkout.session.completed:", expect.any(Error))
  })

  it("alerts the shop to the failed event under its type, naming the event and the cause", async () => {
    constructEventAsync.mockResolvedValue({ id: "evt_1", type: "checkout.session.completed" })
    handledEvent.mockRejectedValue(new Error("inventory compensation failed"))

    await postWebhook({ request: webhookRequest("sig_1") })

    expect(notifyShopOfIncident).toHaveBeenCalledExactlyOnceWith({
      detail: "evt_1: inventory compensation failed",
      kind: "stripeWebhookFailed",
      reference: "checkout.session.completed",
    })
  })

  it("names a cause that is not an Error by its text", async () => {
    constructEventAsync.mockResolvedValue({ id: "evt_1", type: "checkout.session.completed" })
    handledEvent.mockRejectedValue("D1 unavailable")

    await postWebhook({ request: webhookRequest("sig_1") })

    expect(notifyShopOfIncident).toHaveBeenCalledWith(expect.objectContaining({ detail: "evt_1: D1 unavailable" }))
  })

  it("still asks stripe to retry when the alert itself fails", async () => {
    constructEventAsync.mockResolvedValue({ id: "evt_1", type: "checkout.session.completed" })
    handledEvent.mockRejectedValue(new Error("inventory compensation failed"))
    notifyShopOfIncident.mockRejectedValue(new Error("KV unavailable"))

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
  })
})
