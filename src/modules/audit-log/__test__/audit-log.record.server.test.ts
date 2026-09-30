import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type AuditLogQueueMessage } from "~/src/modules/audit-log/audit-log.queue.server"
import {
  SYSTEM_AUDIT_ACTOR,
  resolveRequestAuditActor,
  resolveRequestAuditIp,
  scheduleAuditLog,
  scheduleAuditLogFromRequest,
  scheduleSystemAuditLog,
} from "~/src/modules/audit-log/audit-log.record.server"

interface SessionUser {
  readonly email: string
  readonly id: string
  readonly name: string
  readonly role?: string | null | undefined
}

const state = vi.hoisted(() => {
  const sent: AuditLogQueueMessage[] = []
  const scheduled: Promise<unknown>[] = []
  const request: { headers: Record<string, string>; user: SessionUser | undefined } = { headers: {}, user: undefined }

  return { request, scheduled, sent }
})

vi.mock("cloudflare:workers", () => ({
  env: {
    AUDIT_LOG_QUEUE: {
      send: (message: AuditLogQueueMessage) => {
        state.sent.push(message)

        return Promise.resolve(undefined)
      },
    },
  },
}))
vi.mock("@tanstack/react-start/server", () => ({ getRequestHeaders: () => new Headers(state.request.headers) }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getRequestSession: () => Promise.resolve(state.request.user === undefined ? undefined : { user: state.request.user }),
}))
vi.mock("~/src/lib/background", () => ({
  scheduleBackgroundWork: (task: Promise<unknown>) => {
    state.scheduled.push(task)
  },
}))

const event = {
  action: "order.placed",
  category: "orders",
  severity: "success",
  target: "order-1",
} as const

const settle = async (): Promise<void> => {
  await Promise.all(state.scheduled)
}

const onlySent = (): AuditLogQueueMessage => {
  const [message] = state.sent

  if (message === undefined) {
    throw new Error("Nothing was enqueued")
  }

  return message
}

beforeEach(() => {
  state.request.headers = {}
  state.request.user = undefined
  state.scheduled.length = 0
  state.sent.length = 0
})

describe("resolveRequestAuditActor", () => {
  it("returns undefined without a session", async () => {
    await expect(resolveRequestAuditActor()).resolves.toBeUndefined()
  })

  it("maps an admin session user", async () => {
    state.request.user = { email: "admin@example.test", id: "user-1", name: "Admin", role: "admin" }

    await expect(resolveRequestAuditActor()).resolves.toStrictEqual({
      email: "admin@example.test",
      id: "user-1",
      name: "Admin",
      role: "admin",
    })
  })

  it("maps a customer session user", async () => {
    state.request.user = { email: "ada@example.test", id: "user-2", name: "Ada", role: "customer" }

    await expect(resolveRequestAuditActor()).resolves.toMatchObject({ role: "customer" })
  })

  it("falls back to unknown for an unrecognised role", async () => {
    state.request.user = { email: "bot@example.test", id: "user-3", name: "Bot", role: null }

    await expect(resolveRequestAuditActor()).resolves.toMatchObject({ role: "unknown" })
  })
})

describe("resolveRequestAuditIp", () => {
  it("prefers the Cloudflare connecting ip", () => {
    state.request.headers = { "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" }

    expect(resolveRequestAuditIp()).toBe("203.0.113.7")
  })

  it("falls back to the first forwarded address", () => {
    state.request.headers = { "x-forwarded-for": "198.51.100.1, 203.0.113.9" }

    expect(resolveRequestAuditIp()).toBe("198.51.100.1")
  })

  it("has no ip when the request carries no address headers", () => {
    expect(resolveRequestAuditIp()).toBeUndefined()
  })
})

describe("scheduleAuditLog", () => {
  it("enqueues a message built from the actor and the event", async () => {
    scheduleAuditLog({
      ...event,
      actor: { email: "ada@example.test", id: "user-7", name: "Ada", role: "customer" },
      ip: "203.0.113.7",
      metadata: { total: 1999 },
      resourceId: "order-1",
    })
    await settle()

    expect(onlySent()).toMatchObject({
      action: "order.placed",
      actorId: "user-7",
      actorName: "Ada",
      actorRole: "customer",
      category: "orders",
      ip: "203.0.113.7",
      metadata: '{"total":1999}',
      resourceId: "order-1",
      severity: "success",
      target: "order-1",
    })
  })

  it("stamps the message with an id and a creation time", async () => {
    const before = Date.now()
    scheduleAuditLog({ ...event, actor: SYSTEM_AUDIT_ACTOR })
    await settle()

    expect(onlySent().id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/u)
    expect(onlySent().createdAt).toBeGreaterThanOrEqual(before)
  })

  it("leaves the metadata unset when there is none to serialize", async () => {
    scheduleAuditLog({ ...event, actor: SYSTEM_AUDIT_ACTOR, metadata: {} })
    await settle()

    expect(onlySent().metadata).toBeUndefined()
  })
})

describe("scheduleSystemAuditLog", () => {
  it("attributes the entry to the system actor", async () => {
    scheduleSystemAuditLog(event)
    await settle()

    expect(onlySent()).toMatchObject({ actorId: undefined, actorName: "System", actorRole: "system" })
  })
})

describe("scheduleAuditLogFromRequest", () => {
  it("prefers the supplied actor over the session", async () => {
    state.request.user = { email: "admin@example.test", id: "user-1", name: "Admin", role: "admin" }
    scheduleAuditLogFromRequest({ ...event, actor: { name: "Importer", role: "system" } })
    await settle()

    expect(onlySent()).toMatchObject({ actorName: "Importer", actorRole: "system" })
  })

  it("falls back to the session actor", async () => {
    state.request.user = { email: "admin@example.test", id: "user-1", name: "Admin", role: "admin" }
    scheduleAuditLogFromRequest(event)
    await settle()

    expect(onlySent()).toMatchObject({ actorId: "user-1", actorName: "Admin", actorRole: "admin" })
  })

  it("falls back to the system actor without a session", async () => {
    scheduleAuditLogFromRequest(event)
    await settle()

    expect(onlySent()).toMatchObject({ actorName: "System", actorRole: "system" })
  })

  it("fills the ip in from the request headers", async () => {
    state.request.headers = { "cf-connecting-ip": "203.0.113.7" }
    scheduleAuditLogFromRequest(event)
    await settle()

    expect(onlySent().ip).toBe("203.0.113.7")
  })

  it("keeps an explicitly supplied ip", async () => {
    state.request.headers = { "cf-connecting-ip": "203.0.113.7" }
    scheduleAuditLogFromRequest({ ...event, ip: "198.51.100.1" })
    await settle()

    expect(onlySent().ip).toBe("198.51.100.1")
  })
})
