import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_QUERY_KEYS } from "~/src/modules/audit-log/audit-log.constants"
import { type AuditLogQueueMessage, processAuditLogQueueBatch } from "~/src/modules/audit-log/audit-log.queue.server"

const queue = vi.hoisted(() => ({
  insertAuditLogs: vi.fn(() => Promise.resolve(undefined)),
  publishRealtimeInvalidation: vi.fn(() => Promise.resolve(undefined)),
}))

vi.mock("~/src/modules/audit-log/audit-log.accessors", () => ({ insertAuditLogs: queue.insertAuditLogs }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server", () => ({
  publishRealtimeInvalidation: queue.publishRealtimeInvalidation,
}))

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

const createMessage = (id: string) => ({
  ack: vi.fn(),
  attempts: 1,
  body: body(id),
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

  it("invalidates the admin audit log page and stats queries", async () => {
    await processAuditLogQueueBatch(createBatch([createMessage("first")]))

    expect(queue.publishRealtimeInvalidation).toHaveBeenCalledWith({
      admin: [AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, AUDIT_LOG_QUERY_KEYS.ADMIN.STATS],
    })
  })

  it("inserts nothing and still invalidates for an empty batch", async () => {
    await processAuditLogQueueBatch(createBatch([]))

    expect(queue.insertAuditLogs).toHaveBeenCalledWith([])
    expect(queue.publishRealtimeInvalidation).toHaveBeenCalledTimes(1)
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
