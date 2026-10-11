import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_QUERY_KEYS } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLogQueueMessage, processAuditLogQueueBatch } from "~/src/modules/audit-log/audit-log.queue.server"
import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"

const queue = vi.hoisted(() => ({
  insertAuditLogs: vi.fn(() => Promise.resolve(undefined)),
  notifyShopOfIncident: vi.fn((_incident: { detail: string; kind: string; reference: string }) => Promise.resolve(undefined)),
  publishRealtimeInvalidation: vi.fn(() => Promise.resolve(undefined)),
}))

vi.mock("~/src/modules/audit-log/audit-log.accessors", () => ({ insertAuditLogs: queue.insertAuditLogs }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server", () => ({
  publishRealtimeInvalidation: queue.publishRealtimeInvalidation,
}))
vi.mock("~/src/integrations/resend/incident-alert.notification.server", () => ({ notifyShopOfIncident: queue.notifyShopOfIncident }))

const body = (id: string): AuditLogQueueMessage => ({
  action: "order.placed",
  actorId: `actor-${id}`,
  actorName: "System",
  actorRole: "system",
  category: "orders",
  createdAt: 1_700_000_000_000,
  detail: `detail-${id}`,
  id,
  ip: "203.0.113.7",
  metadata: '{"total":1999}',
  resourceId: `order-${id}`,
  severity: "success",
  target: `order-${id}`,
})

const createMessage = (id: string, overrides: Partial<AuditLogQueueMessage> = {}) => ({
  ack: vi.fn(),
  attempts: 1,
  body: { ...body(id), ...overrides },
  id,
  retry: vi.fn(),
  timestamp: new Date(1_700_000_000_000),
})

const createBatch = (messages: ReturnType<typeof createMessage>[]) => ({
  ackAll: vi.fn(),
  messages,
  metadata: { metrics: { backlogBytes: 0, backlogCount: messages.length } },
  queue: "audit-log",
  retryAll: vi.fn(),
})

describe("processAuditLogQueueBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queue.insertAuditLogs.mockResolvedValue(undefined)
  })

  it("inserts every message body as an audit row", async () => {
    await processAuditLogQueueBatch(createBatch([createMessage("first"), createMessage("second")]))

    expect(queue.insertAuditLogs).toHaveBeenCalledTimes(1)
    expect(queue.insertAuditLogs).toHaveBeenCalledWith([body("first"), body("second")])
  })

  it("acknowledges every message after a successful insert", async () => {
    const first = createMessage("first")
    const second = createMessage("second")

    await processAuditLogQueueBatch(createBatch([first, second]))

    expect(first.ack).toHaveBeenCalledTimes(1)
    expect(second.ack).toHaveBeenCalledTimes(1)
    expect(first.retry).not.toHaveBeenCalled()
    expect(second.retry).not.toHaveBeenCalled()
  })

  it("invalidates only the admin audit log page and stats queries for events outside any order timeline", async () => {
    await processAuditLogQueueBatch(createBatch([createMessage("first", { action: "product.updated", category: "catalog" })]))

    expect(queue.publishRealtimeInvalidation).toHaveBeenCalledWith({
      admin: [AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, AUDIT_LOG_QUERY_KEYS.ADMIN.STATS],
    })
  })

  it("refreshes the admin order queries when the batch adds to an order timeline, such as a failed order email", async () => {
    await processAuditLogQueueBatch(
      createBatch([
        createMessage("first", { action: "product.updated", category: "catalog" }),
        createMessage("second", { action: "email.failed", category: "email", severity: "error" }),
      ]),
    )

    expect(queue.publishRealtimeInvalidation).toHaveBeenCalledWith({
      admin: [AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, AUDIT_LOG_QUERY_KEYS.ADMIN.STATS, ORDER_QUERY_KEYS.ADMIN.ORDERS],
    })
  })

  it("inserts nothing and still invalidates for an empty batch", async () => {
    await processAuditLogQueueBatch(createBatch([]))

    expect(queue.insertAuditLogs).toHaveBeenCalledWith([])
    expect(queue.publishRealtimeInvalidation).toHaveBeenCalledTimes(1)
  })

  it("alerts nobody when the batch is written", async () => {
    await processAuditLogQueueBatch(createBatch([createMessage("first")]))

    expect(queue.notifyShopOfIncident).not.toHaveBeenCalled()
  })
})

describe("processAuditLogQueueBatch when the insert fails", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

  beforeEach(() => {
    vi.clearAllMocks()
    queue.insertAuditLogs.mockRejectedValue(new Error("D1_ERROR: no such table"))
  })

  afterAll(() => {
    consoleError.mockRestore()
  })

  it("retries every message instead of acknowledging it", async () => {
    const first = createMessage("first")
    const second = createMessage("second")

    await processAuditLogQueueBatch(createBatch([first, second]))

    expect(first.retry).toHaveBeenCalledTimes(1)
    expect(second.retry).toHaveBeenCalledTimes(1)
    expect(first.ack).not.toHaveBeenCalled()
    expect(second.ack).not.toHaveBeenCalled()
  })

  it("does not invalidate queries when nothing was written", async () => {
    await processAuditLogQueueBatch(createBatch([createMessage("first")]))

    expect(queue.publishRealtimeInvalidation).not.toHaveBeenCalled()
  })

  it("logs the failure with the queue prefix", async () => {
    await processAuditLogQueueBatch(createBatch([createMessage("first")]))

    expect(consoleError).toHaveBeenCalledWith("[AuditLog Queue] Batch insert failed:", new Error("D1_ERROR: no such table"))
  })

  it("alerts the shop to the failure under the queue's name after marking the batch for retry", async () => {
    const steps: string[] = []
    const first = createMessage("first")
    first.retry.mockImplementationOnce(() => {
      steps.push("retry")
    })
    queue.notifyShopOfIncident.mockImplementationOnce(() => {
      steps.push("alert")

      return Promise.resolve(undefined)
    })

    await processAuditLogQueueBatch(createBatch([first]))

    expect(steps).toStrictEqual(["retry", "alert"])
    expect(queue.notifyShopOfIncident).toHaveBeenCalledExactlyOnceWith({
      detail: "D1_ERROR: no such table",
      kind: "auditQueueFailed",
      reference: "audit-log",
    })
  })

  it("names a cause that is not an Error by its text", async () => {
    queue.insertAuditLogs.mockRejectedValue("D1 unavailable")

    await processAuditLogQueueBatch(createBatch([createMessage("first")]))

    expect(queue.notifyShopOfIncident).toHaveBeenCalledWith(expect.objectContaining({ detail: "D1 unavailable" }))
  })

  it("does not swallow an acknowledgement failure into a retry loop", async () => {
    queue.insertAuditLogs.mockResolvedValue(undefined)
    const failing = createMessage("first")
    failing.ack.mockImplementation(() => {
      throw new Error("ack failed")
    })

    await processAuditLogQueueBatch(createBatch([failing]))

    expect(failing.retry).toHaveBeenCalledTimes(1)
    expect(queue.publishRealtimeInvalidation).not.toHaveBeenCalled()
  })
})

const deadLettered = (message: ReturnType<typeof createMessage>) => ({ ...createBatch([message]), queue: "audit-log-dlq" })

describe("processAuditLogQueueBatch for the dead-letter queue", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

  beforeEach(() => {
    vi.clearAllMocks()
    queue.insertAuditLogs.mockResolvedValue(undefined)
  })

  afterAll(() => {
    consoleError.mockRestore()
  })

  it("writes a message that failed in a batch with others once it is retried on its own", async () => {
    const message = createMessage("first")

    await processAuditLogQueueBatch(deadLettered(message))

    expect(queue.insertAuditLogs).toHaveBeenCalledExactlyOnceWith([body("first")])
    expect(message.ack).toHaveBeenCalledOnce()
  })

  it("retries a message that still cannot be written and alerts under the dead-letter queue's name", async () => {
    queue.insertAuditLogs.mockRejectedValue(new Error("D1_ERROR: NOT NULL constraint failed: audit_log.target"))
    const message = createMessage("first")

    await processAuditLogQueueBatch(deadLettered(message))

    expect(message.retry).toHaveBeenCalledOnce()
    expect(queue.notifyShopOfIncident).toHaveBeenCalledExactlyOnceWith({
      detail: "D1_ERROR: NOT NULL constraint failed: audit_log.target",
      kind: "auditQueueFailed",
      reference: "audit-log-dlq",
    })
  })
})
