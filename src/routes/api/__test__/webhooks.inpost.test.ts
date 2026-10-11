import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { INPOST_WEBHOOK_RATE_LIMIT } from "~/src/integrations/inpost/inpost.constants"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { RATE_LIMIT_WINDOW_SECONDS } from "~/src/modules/rate-limit/rate-limit.constants"

interface RouteDefinition {
  readonly server: {
    readonly handlers: {
      readonly GET: () => Response
      readonly POST: (context: { readonly request: Request }) => Promise<Response>
    }
  }
}

const captured: { current: RouteDefinition | undefined } = { current: undefined }

const env = { INPOST_ORGANIZATION_ID: "1001" }

const doubles = vi.hoisted(() => ({
  configured: { current: true },
  getOrderByInpostShipmentId: vi.fn<(shipmentId: string) => Promise<{ id: string } | undefined>>(),
  scheduleAdminOrdersInvalidation: vi.fn<() => void>(),
  syncOrderInpostShipment: vi.fn<(orderId: string, shipmentId: string) => Promise<void>>(),
  withinRateLimit: vi.fn<(limit: Readonly<{ key: string; limit: number; windowSeconds: number }>) => Promise<boolean>>(),
}))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: RouteDefinition) => {
    captured.current = options

    return options
  },
}))
vi.mock("~/src/integrations/inpost/inpost.shipx.server", () => ({ isInpostShipxConfigured: () => doubles.configured.current }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminOrdersInvalidation: doubles.scheduleAdminOrdersInvalidation,
}))
vi.mock("~/src/modules/order/order.accessors", () => ({ getOrderByInpostShipmentId: doubles.getOrderByInpostShipmentId }))
vi.mock("~/src/modules/order/order.shipment.server", () => ({ syncOrderInpostShipment: doubles.syncOrderInpostShipment }))
vi.mock("~/src/lib/rate-limit", () => ({ clientAddress: () => "203.0.113.7", withinRateLimit: doubles.withinRateLimit }))

const { SHIPX_SHIPMENT_ID, shipxStatusChangedEvent } = await import("~/src/integrations/inpost/__test__/fixtures/shipx")

await import("~/src/routes/api/webhooks.inpost")

const route = captured.current

if (route === undefined) {
  throw new Error("the InPost webhook route did not register a handler")
}

const { GET: getWebhook, POST: postWebhook } = route.server.handlers

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const webhookRequest = (body: unknown): Request =>
  new Request("https://store.test/api/webhooks/inpost", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  })

beforeEach(() => {
  vi.clearAllMocks()
  doubles.configured.current = true
  env.INPOST_ORGANIZATION_ID = "1001"
  doubles.getOrderByInpostShipmentId.mockResolvedValue({ id: ORDER_ID })
  doubles.syncOrderInpostShipment.mockResolvedValue()
  doubles.withinRateLimit.mockResolvedValue(true)
})

describe("InPost webhook route", () => {
  it("answers the GET InPost Manager sends to check the address", async () => {
    const response = getWebhook()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ ready: true })
  })

  it("reads the shipment back from InPost for the order holding it instead of trusting the payload", async () => {
    const response = await postWebhook({ request: webhookRequest(shipxStatusChangedEvent) })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ received: true })
    expect(doubles.getOrderByInpostShipmentId).toHaveBeenCalledWith(String(SHIPX_SHIPMENT_ID))
    expect(doubles.syncOrderInpostShipment).toHaveBeenCalledExactlyOnceWith(ORDER_ID, String(SHIPX_SHIPMENT_ID))
    expect(doubles.scheduleAdminOrdersInvalidation).toHaveBeenCalledOnce()
  })

  it("counts every call against its address within the one-minute request window", async () => {
    await postWebhook({ request: webhookRequest(shipxStatusChangedEvent) })

    expect(doubles.withinRateLimit).toHaveBeenCalledExactlyOnceWith({
      key: "inpost-webhook:203.0.113.7",
      limit: INPOST_WEBHOOK_RATE_LIMIT,
      windowSeconds: RATE_LIMIT_WINDOW_SECONDS.REQUEST,
    })
    expect(INPOST_WEBHOOK_RATE_LIMIT).toBe(120)
  })

  it("answers an address past its limit with 429 before it reads the body or an order", async () => {
    doubles.withinRateLimit.mockResolvedValue(false)
    const request = webhookRequest(shipxStatusChangedEvent)

    const response = await postWebhook({ request })

    expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS)
    expect(request.bodyUsed).toBe(false)
    expect(doubles.getOrderByInpostShipmentId).not.toHaveBeenCalled()
    expect(doubles.syncOrderInpostShipment).not.toHaveBeenCalled()
  })

  it.each([
    ["a body that is not JSON", "not json"],
    ["an event without a shipment", { ...shipxStatusChangedEvent, payload: {} }],
    ["another organisation's event", { ...shipxStatusChangedEvent, organization_id: 7 }],
  ])("refuses %s without touching an order", async (_label, body) => {
    const response = await postWebhook({ request: webhookRequest(body) })

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    expect(doubles.getOrderByInpostShipmentId).not.toHaveBeenCalled()
    expect(doubles.syncOrderInpostShipment).not.toHaveBeenCalled()
  })

  it("refuses every event while the shop has no InPost credentials", async () => {
    doubles.configured.current = false

    const response = await postWebhook({ request: webhookRequest(shipxStatusChangedEvent) })

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    expect(doubles.syncOrderInpostShipment).not.toHaveBeenCalled()
  })

  it("acknowledges a shipment no order holds, such as one booked in InPost Manager", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {})
    doubles.getOrderByInpostShipmentId.mockResolvedValue(undefined)

    const response = await postWebhook({ request: webhookRequest(shipxStatusChangedEvent) })

    expect(response.status).toBe(200)
    expect(info).toHaveBeenCalledWith(
      `[InPost] Safely ignoring shipment_status_changed for shipment ${String(SHIPX_SHIPMENT_ID)}, which no order holds`,
    )
    expect(doubles.syncOrderInpostShipment).not.toHaveBeenCalled()
    expect(doubles.scheduleAdminOrdersInvalidation).not.toHaveBeenCalled()
    info.mockRestore()
  })

  it("asks InPost to retry when the shipment cannot be read back", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const outage = new Error("InPost did not answer")
    doubles.syncOrderInpostShipment.mockRejectedValue(outage)

    const response = await postWebhook({ request: webhookRequest(shipxStatusChangedEvent) })

    expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    expect(log).toHaveBeenCalledWith(
      `[InPost] Shipment ${String(SHIPX_SHIPMENT_ID)} could not be read back from ShipX after shipment_status_changed:`,
      outage,
    )
    expect(doubles.scheduleAdminOrdersInvalidation).not.toHaveBeenCalled()
    log.mockRestore()
  })
})
