import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { ZodError } from "zod"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { setOrderTrackingNumber, setOrderTrackingNumberMutation } from "../set-order-tracking-number"

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const TRACKING_EMAIL_SENT = { kind: "order-tracking", status: "sent" }

const INVALID_STATE = new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE)

const database = vi.hoisted(() => {
  const updates: Record<string, unknown>[] = []
  const matched = { current: true }

  return {
    matched,
    updateSet: vi.fn((values: Record<string, unknown>) => {
      updates.push(values)

      return {
        where: () => ({ returning: () => Promise.resolve(matched.current ? [{ id: "0192f3a4-5b6c-7d8e-9fab-cdef01234567" }] : []) }),
      }
    }),
    updates,
  }
})

interface ActionRow {
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly status: Order["select"]["status"]
}

const orderRow = vi.hoisted(() => ({ current: undefined as ActionRow | undefined }))

const recordOrderTrackingUpdatedAudit = vi.hoisted(() => vi.fn())

const announceOrderShipment = vi.hoisted(() =>
  vi.fn<(orderId: string, origin: string) => Promise<{ readonly kind: string; readonly status: string }>>(),
)

const getRequest = vi.hoisted(() => vi.fn<() => Request>())

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("@tanstack/react-start/server", () => ({ getRequest }))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: { update: () => ({ set: database.updateSet }) },
}))
vi.mock("~/src/modules/order/use-cases/announce-order-shipment.server", () => ({ announceOrderShipment }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordOrderTrackingUpdatedAudit }))
vi.mock(import("~/src/modules/order/use-cases/transition-order.server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getAdminOrderActionRow: () => Promise.resolve(orderRow.current) }
})
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) =>
        handler({ data: builder.validate(options.data) }),
      middleware: () => builder,
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate

        return builder
      },
    }

    return builder
  },
}))

const dialect = new SQLiteSyncDialect()

const renderedSql = (value: unknown): string => {
  if (!(value instanceof SQL)) {
    throw new TypeError("Expected a SQL expression")
  }

  return dialect.sqlToQuery(value).sql
}

const saveTracking = (tracking: { readonly trackingNumber: string; readonly trackingUrl?: string }) =>
  setOrderTrackingNumber({ data: { orderId: ORDER_ID, ...tracking } })

beforeEach(() => {
  vi.clearAllMocks()
  getRequest.mockReturnValue(new Request("http://127.0.0.1:3000/_serverFn/set-order-tracking-number"))
  announceOrderShipment.mockResolvedValue(TRACKING_EMAIL_SENT)
  database.updates.length = 0
  database.matched.current = true
  orderRow.current = { fulfillmentStatus: "shipped", status: "processing" }
})

describe("setOrderTrackingNumber", () => {
  it("saves the trimmed number and link of a shipped order without touching its step or shipping date", async () => {
    await expect(saveTracking({ trackingNumber: "  TRK-50  ", trackingUrl: "https://tracking.test/TRK-50" })).resolves.toStrictEqual({
      email: TRACKING_EMAIL_SENT,
      ok: true,
      orderId: ORDER_ID,
    })

    expect(database.updates).toHaveLength(1)
    expect(database.updates[0]).toMatchObject({ trackingNumber: "TRK-50", trackingUrl: "https://tracking.test/TRK-50" })
    expect(database.updates[0]).not.toHaveProperty("fulfillmentStatus")
    expect(database.updates[0]).not.toHaveProperty("shippedAt")
  })

  it("drops the stored link when the new number comes without one", async () => {
    await saveTracking({ trackingNumber: "TRK-50" })

    expect(renderedSql(database.updates[0]?.["trackingUrl"])).toBe("null")
  })

  it("records the number in the audit log and tells the customer on the shop the admin works in", async () => {
    await saveTracking({ trackingNumber: "TRK-50" })

    expect(recordOrderTrackingUpdatedAudit).toHaveBeenCalledExactlyOnceWith(ORDER_ID, { detail: "TRK-50" })
    expect(announceOrderShipment).toHaveBeenCalledExactlyOnceWith(ORDER_ID, "http://127.0.0.1:3000")
  })

  it("refuses a blank tracking number before the order is touched", () => {
    expect(() => saveTracking({ trackingNumber: "   " })).toThrow(ZodError)

    expect(database.updates).toHaveLength(0)
    expect(announceOrderShipment).not.toHaveBeenCalled()
  })

  it("refuses a request on a host this build does not serve before the order is touched", async () => {
    getRequest.mockReturnValue(new Request("https://martebizuteria.pl.attacker.example/_serverFn/set-order-tracking-number"))

    await expect(saveTracking({ trackingNumber: "TRK-50" })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(database.updates).toHaveLength(0)
  })

  it.each([
    ["not shipped yet", { fulfillmentStatus: "fulfilled", status: "processing" }],
    ["already delivered", { fulfillmentStatus: "delivered", status: "completed" }],
    ["refunded", { fulfillmentStatus: "shipped", status: "refunded" }],
  ] as const)("refuses an order that is %s", async (_state, row) => {
    orderRow.current = row

    await expect(saveTracking({ trackingNumber: "TRK-50" })).rejects.toThrow(INVALID_STATE)
    expect(database.updates).toHaveLength(0)
    expect(recordOrderTrackingUpdatedAudit).not.toHaveBeenCalled()
  })

  it("refuses an order that stopped being shipped in the meantime, without an audit entry or an email", async () => {
    database.matched.current = false

    await expect(saveTracking({ trackingNumber: "TRK-50" })).rejects.toThrow(INVALID_STATE)
    expect(recordOrderTrackingUpdatedAudit).not.toHaveBeenCalled()
    expect(announceOrderShipment).not.toHaveBeenCalled()
  })

  it("reports an order that no longer exists", async () => {
    orderRow.current = undefined

    await expect(saveTracking({ trackingNumber: "TRK-50" })).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
  })

  it("saves through its mutation, keyed by the shared tracking number key", async () => {
    expect(setOrderTrackingNumberMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.SET_TRACKING_NUMBER)
    await expect(
      new MutationObserver(new QueryClient(), setOrderTrackingNumberMutation).mutate({ orderId: ORDER_ID, trackingNumber: "TRK-50" }),
    ).resolves.toStrictEqual({ email: TRACKING_EMAIL_SENT, ok: true, orderId: ORDER_ID })
  })
})
