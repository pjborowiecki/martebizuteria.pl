import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

interface RouteDefinition {
  readonly server: {
    readonly handlers: {
      readonly GET: () => Response
      readonly POST: (context: { readonly request: Request }) => Promise<Response>
    }
  }
}

interface WebhookEvent {
  readonly data: { readonly object: { readonly metadata: Readonly<Record<string, string>> | null; readonly object: string } }
  readonly id: string
  readonly livemode: boolean
  readonly type: string
}

const captured: { current: RouteDefinition | undefined } = { current: undefined }

const env = { APP_ENV: "preview", STRIPE_WEBHOOK_SECRET: "whsec_test" }

const constructEventAsync = vi.fn<(body: string, signature: string, secret: string) => Promise<WebhookEvent>>()

const handledEvent = vi.fn<(event: WebhookEvent) => Promise<void>>()

const sendIncidentAlert = vi.fn<(incident: { detail: string; kind: string; reference: string }) => Promise<void>>()

const webhookHandlers: Record<string, (event: WebhookEvent) => Promise<void>> = {
  "checkout.session.async_payment_failed": handledEvent,
  "checkout.session.async_payment_succeeded": handledEvent,
  "checkout.session.completed": handledEvent,
  "checkout.session.expired": handledEvent,
  "payment_intent.payment_failed": handledEvent,
}

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: RouteDefinition) => {
    captured.current = options

    return options
  },
}))
vi.mock("~/src/lib/incident-alert.server", () => ({ sendIncidentAlert }))
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

const stripeEvent = (type: string, livemode = false, id = "evt_1"): WebhookEvent => ({
  data: { object: { metadata: { checkoutId: "checkout-1" }, object: "checkout.session" } },
  id,
  livemode,
  type,
})

const stampedEvent = (type: string, deployment: string): WebhookEvent => ({
  ...stripeEvent(type),
  data: { object: { metadata: { checkoutId: "checkout-1", deployment }, object: "checkout.session" } },
})

beforeEach(() => {
  vi.clearAllMocks()
  env.APP_ENV = "preview"
  env.STRIPE_WEBHOOK_SECRET = "whsec_test"
  sendIncidentAlert.mockResolvedValue(undefined)
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
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
    constructEventAsync.mockResolvedValue(stripeEvent("checkout.session.completed"))
    handledEvent.mockResolvedValue(undefined)

    await postWebhook({ request: webhookRequest("sig_1") })

    expect(constructEventAsync).toHaveBeenCalledWith(JSON.stringify({ id: "evt_1" }), "sig_1", "whsec_test")
  })

  it("runs the handler registered for the event type and acknowledges it", async () => {
    const event = stripeEvent("checkout.session.completed")
    constructEventAsync.mockResolvedValue(event)
    handledEvent.mockResolvedValue(undefined)

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(handledEvent).toHaveBeenCalledWith(event)
    await expect(response.json()).resolves.toStrictEqual({ received: true })
    expect(sendIncidentAlert).not.toHaveBeenCalled()
  })

  it("acknowledges an event nobody handles instead of failing the delivery", async () => {
    constructEventAsync.mockResolvedValue(stripeEvent("invoice.paid"))

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(handledEvent).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ received: true })
  })

  it("asks stripe to retry when the domain handler throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    constructEventAsync.mockResolvedValue(stripeEvent("checkout.session.completed"))
    handledEvent.mockRejectedValue(new Error("inventory compensation failed"))

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    await expect(response.text()).resolves.toBe("Internal Server Error")
    expect(consoleError).toHaveBeenCalledWith("[Stripe] Domain logic failed for checkout.session.completed:", expect.any(Error))
  })

  it("alerts the shop to the failed event under its id, naming its type and the cause", async () => {
    constructEventAsync.mockResolvedValue(stripeEvent("checkout.session.completed"))
    handledEvent.mockRejectedValue(new Error("inventory compensation failed"))

    await postWebhook({ request: webhookRequest("sig_1") })

    expect(sendIncidentAlert).toHaveBeenCalledExactlyOnceWith({
      detail: "checkout.session.completed: inventory compensation failed",
      kind: "stripeWebhookFailed",
      reference: "evt_1",
    })
  })

  it("keeps two failed events of one type apart, so each paid session that created no order is reported", async () => {
    handledEvent.mockRejectedValue(new Error("D1 unavailable"))

    constructEventAsync.mockResolvedValueOnce(stripeEvent("checkout.session.completed", false, "evt_paid_1"))
    await postWebhook({ request: webhookRequest("sig_1") })
    constructEventAsync.mockResolvedValueOnce(stripeEvent("checkout.session.completed", false, "evt_paid_2"))
    await postWebhook({ request: webhookRequest("sig_2") })

    expect(sendIncidentAlert.mock.calls.map(([incident]) => incident.reference)).toStrictEqual(["evt_paid_1", "evt_paid_2"])
  })

  it("names a cause that is not an Error by its text", async () => {
    constructEventAsync.mockResolvedValue(stripeEvent("checkout.session.completed"))
    handledEvent.mockRejectedValue("D1 unavailable")

    await postWebhook({ request: webhookRequest("sig_1") })

    expect(sendIncidentAlert).toHaveBeenCalledWith(expect.objectContaining({ detail: "checkout.session.completed: D1 unavailable" }))
  })

  it("still asks stripe to retry when the alert itself fails", async () => {
    constructEventAsync.mockResolvedValue(stripeEvent("checkout.session.completed"))
    handledEvent.mockRejectedValue(new Error("inventory compensation failed"))
    sendIncidentAlert.mockRejectedValue(new Error("KV unavailable"))

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
  })
})

describe("stripe webhook mode", () => {
  it.each(["development", "preview", "test"])(
    "acknowledges a live event in %s without acting on it, so Stripe stops retrying it",
    async (appEnv) => {
      const log = vi.spyOn(console, "error").mockImplementation(() => {})
      env.APP_ENV = appEnv
      constructEventAsync.mockResolvedValue(stripeEvent("checkout.session.completed", true))

      const response = await postWebhook({ request: webhookRequest("sig_1") })

      expect(handledEvent).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toStrictEqual({ received: true })
      expect(log).toHaveBeenCalledWith(
        `[Stripe] Ignoring live event evt_1 (checkout.session.completed): ${appEnv} accepts only test events`,
      )
    },
  )

  it("acknowledges a test event in production without acting on it, so Stripe stops retrying it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    env.APP_ENV = "production"
    constructEventAsync.mockResolvedValue(stripeEvent("checkout.session.completed"))

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(handledEvent).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ received: true })
    expect(log).toHaveBeenCalledWith("[Stripe] Ignoring test event evt_1 (checkout.session.completed): production accepts only live events")
  })

  it("runs the handler for a live event in production", async () => {
    env.APP_ENV = "production"
    const event = stripeEvent("checkout.session.completed", true)
    constructEventAsync.mockResolvedValue(event)
    handledEvent.mockResolvedValue(undefined)

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(handledEvent).toHaveBeenCalledWith(event)
    await expect(response.json()).resolves.toStrictEqual({ received: true })
  })

  it("reports an event type nobody handles as the wrong mode when it comes from the other mode", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const unhandled = vi.spyOn(console, "info").mockImplementation(() => {})
    env.APP_ENV = "production"
    constructEventAsync.mockResolvedValue(stripeEvent("invoice.paid"))

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(response.status).toBe(200)
    expect(log).toHaveBeenCalledWith("[Stripe] Ignoring test event evt_1 (invoice.paid): production accepts only live events")
    expect(unhandled).not.toHaveBeenCalled()
  })
})

describe("stripe webhook deployment", () => {
  it.each([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
    "payment_intent.payment_failed",
  ])("acknowledges %s for a checkout a local test run created, without acting, auditing or alerting", async (type) => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {})
    constructEventAsync.mockResolvedValue(stampedEvent(type, "martebizuteria-test"))

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(handledEvent).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ received: true })
    expect(sendIncidentAlert).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(
      `[Stripe] Ignoring event evt_1 (${type}): its checkout belongs to martebizuteria-test, while preview keeps its checkouts in martebizuteria-preview`,
    )
  })

  it.each([
    {
      appEnv: "preview",
      deployment: "martebizuteria-preview",
      label: "a checkout preview or a local development server wrote to the preview database",
    },
    { appEnv: "development", deployment: "martebizuteria-preview", label: "a checkout preview created, forwarded to a development server" },
    { appEnv: "test", deployment: "martebizuteria-test", label: "a checkout a local test run created, forwarded to that run" },
  ])("runs the handler for $label", async ({ appEnv, deployment }) => {
    env.APP_ENV = appEnv
    const event = stampedEvent("checkout.session.completed", deployment)
    constructEventAsync.mockResolvedValue(event)
    handledEvent.mockResolvedValue(undefined)

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(handledEvent).toHaveBeenCalledExactlyOnceWith(event)
    expect(response.status).toBe(200)
  })

  it.each(["martebizuteria-before-the-database-was-renamed", "martebizuteria-preview"])(
    "runs production's handler for a live event whatever deployment it names, here %s, since no other deployment takes live payments",
    async (deployment) => {
      env.APP_ENV = "production"
      const log = vi.spyOn(console, "info").mockImplementation(() => {})
      const event = { ...stampedEvent("checkout.session.completed", deployment), livemode: true }
      constructEventAsync.mockResolvedValue(event)
      handledEvent.mockResolvedValue(undefined)

      const response = await postWebhook({ request: webhookRequest("sig_1") })

      expect(handledEvent).toHaveBeenCalledExactlyOnceWith(event)
      expect(response.status).toBe(200)
      expect(log).not.toHaveBeenCalled()
    },
  )

  it("runs the handler for a session created before sessions carried their deployment", async () => {
    const event = stripeEvent("checkout.session.completed")
    constructEventAsync.mockResolvedValue(event)
    handledEvent.mockResolvedValue(undefined)

    await postWebhook({ request: webhookRequest("sig_1") })

    expect(handledEvent).toHaveBeenCalledExactlyOnceWith(event)
  })

  it("still alerts and asks Stripe to retry when a paid session of this deployment creates no order", async () => {
    constructEventAsync.mockResolvedValue(stampedEvent("checkout.session.completed", "martebizuteria-preview"))
    handledEvent.mockRejectedValue(new Error("D1 unavailable"))

    const response = await postWebhook({ request: webhookRequest("sig_1") })

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    expect(sendIncidentAlert).toHaveBeenCalledExactlyOnceWith({
      detail: "checkout.session.completed: D1 unavailable",
      kind: "stripeWebhookFailed",
      reference: "evt_1",
    })
  })
})
