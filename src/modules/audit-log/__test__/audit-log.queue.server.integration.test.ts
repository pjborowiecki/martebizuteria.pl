import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { deleteAuditLogs, getAdminAuditLogStats } from "~/src/modules/audit-log/audit-log.accessors"
import { recordOrderFulfillmentFailedAudit, recordOrderPlacedAudit } from "~/src/modules/audit-log/audit-log.events.server"
import { type AuditLogQueueMessage, processAuditLogQueueBatch } from "~/src/modules/audit-log/audit-log.queue.server"
import { resolveAuditLogToday } from "~/src/modules/audit-log/audit-log.utils"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

const queue = vi.hoisted(() => ({ scheduled: [] as Promise<unknown>[], sent: [] as AuditLogQueueMessage[] }))

vi.mock("cloudflare:workers", () => ({
  env: {
    AUDIT_LOG_QUEUE: {
      send: (message: AuditLogQueueMessage) => {
        queue.sent.push(message)

        return Promise.resolve(undefined)
      },
    },
  },
}))
vi.mock("@tanstack/react-start/server", () => ({ getRequestHeaders: () => new Headers() }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: () => Promise.resolve(undefined) }))
vi.mock("~/src/lib/background", () => ({
  scheduleBackgroundWork: (task: Promise<unknown>) => {
    queue.scheduled.push(task)
  },
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server", () => ({
  publishRealtimeInvalidation: () => Promise.resolve(undefined),
}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const FAILED_SESSION_ID = "cs_test_failing"

const FAILED_SESSION_ENTRY_ID = "order.fulfillment_failed:cs_test_failing"

const storedEntry = z.object({ action: z.string(), detail: z.string().nullable(), resource_id: z.string(), severity: z.string() })

const storedEntries = (): z.infer<typeof storedEntry>[] =>
  z
    .array(storedEntry)
    .parse(sqlite.prepare("select action, detail, resource_id, severity from audit_log order by action, resource_id").all())

const deliverQueuedEvents = async (): Promise<ReturnType<typeof vi.fn>[]> => {
  await Promise.all(queue.scheduled.splice(0))
  const messages = queue.sent.splice(0).map((body) => ({
    ack: vi.fn(),
    attempts: 1,
    body,
    id: body.id,
    retry: vi.fn(),
    timestamp: new Date(body.createdAt),
  }))
  await processAuditLogQueueBatch({
    ackAll: vi.fn<() => void>(),
    messages,
    metadata: { metrics: { backlogBytes: 0, backlogCount: messages.length } },
    queue: "audit-log",
    retryAll: vi.fn<() => void>(),
  })

  return messages.map((message) => message.ack)
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  sqlite.exec("delete from audit_log")
  queue.scheduled.length = 0
  queue.sent.length = 0
})

afterAll(() => {
  sqlite.close()
})

describe("a paid session whose fulfilment fails on every Stripe delivery", () => {
  it("leaves one error entry for the session, as the first delivery described it", async () => {
    recordOrderFulfillmentFailedAudit(FAILED_SESSION_ID, { detail: "548,00 PLN — anna@example.com — D1 unavailable" })
    await deliverQueuedEvents()
    recordOrderFulfillmentFailedAudit(FAILED_SESSION_ID, { detail: "548,00 PLN — anna@example.com — D1 unavailable" })
    await deliverQueuedEvents()
    recordOrderFulfillmentFailedAudit(FAILED_SESSION_ID, { detail: "548,00 PLN — anna@example.com — D1 unavailable" })
    recordOrderFulfillmentFailedAudit(FAILED_SESSION_ID, { detail: "548,00 PLN — anna@example.com — D1 unavailable" })
    await deliverQueuedEvents()

    expect(storedEntries()).toStrictEqual([
      {
        action: "order.fulfillment_failed",
        detail: "548,00 PLN — anna@example.com — D1 unavailable",
        resource_id: FAILED_SESSION_ID,
        severity: "error",
      },
    ])
    await expect(getAdminAuditLogStats(resolveAuditLogToday("Europe/Warsaw"), "Europe/Warsaw")).resolves.toMatchObject({
      errorCount: 1,
      totalCount: 1,
    })
  })

  it("stores and acknowledges the other events delivered in the same batch as a repeated failure", async () => {
    recordOrderFulfillmentFailedAudit(FAILED_SESSION_ID, { detail: "D1 unavailable" })
    await deliverQueuedEvents()
    recordOrderFulfillmentFailedAudit(FAILED_SESSION_ID, { detail: "D1 unavailable" })
    recordOrderPlacedAudit("order-7", { detail: "jan@example.com" })

    const acknowledgements = await deliverQueuedEvents()

    expect(storedEntries().map(({ action }) => action)).toStrictEqual(["order.fulfillment_failed", "order.placed"])
    for (const ack of acknowledgements) {
      expect(ack).toHaveBeenCalledOnce()
    }
  })

  it("gives each failing session an entry of its own", async () => {
    recordOrderFulfillmentFailedAudit(FAILED_SESSION_ID, { detail: "D1 unavailable" })
    recordOrderFulfillmentFailedAudit("cs_test_other", { detail: "D1 unavailable" })
    await deliverQueuedEvents()

    expect(storedEntries().map(({ resource_id }) => resource_id)).toStrictEqual([FAILED_SESSION_ID, "cs_test_other"])
    await expect(getAdminAuditLogStats(resolveAuditLogToday("Europe/Warsaw"), "Europe/Warsaw")).resolves.toMatchObject({ errorCount: 2 })
  })

  it("records the failure again when it recurs after the admin deleted the entry", async () => {
    recordOrderFulfillmentFailedAudit(FAILED_SESSION_ID, { detail: "D1 unavailable" })
    await deliverQueuedEvents()
    await deleteAuditLogs([FAILED_SESSION_ENTRY_ID])

    recordOrderFulfillmentFailedAudit(FAILED_SESSION_ID, { detail: "No pending checkout for the session" })
    await deliverQueuedEvents()

    expect(storedEntries()).toStrictEqual([
      {
        action: "order.fulfillment_failed",
        detail: "No pending checkout for the session",
        resource_id: FAILED_SESSION_ID,
        severity: "error",
      },
    ])
  })
})
