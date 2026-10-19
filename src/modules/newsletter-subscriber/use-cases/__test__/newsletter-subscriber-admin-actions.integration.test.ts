import { QueryClient } from "@tanstack/react-query"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { AUDIT_LOG_QUERY_KEYS } from "~/src/modules/audit-log/audit-log.constants"
import {
  NEWSLETTER_ERROR_CODES,
  NEWSLETTER_MUTATION_KEYS,
  NEWSLETTER_QUERY_KEYS,
  NEWSLETTER_TOKEN_RESULT,
} from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { confirmNewsletterSubscription } from "~/src/modules/newsletter-subscriber/use-cases/confirm-newsletter-subscription"
import {
  eraseNewsletterSubscriber,
  eraseNewsletterSubscriberMutation,
} from "~/src/modules/newsletter-subscriber/use-cases/erase-newsletter-subscriber"
import {
  unsubscribeNewsletterSubscriber,
  unsubscribeNewsletterSubscriberMutation,
} from "~/src/modules/newsletter-subscriber/use-cases/unsubscribe-newsletter-subscriber"

const { doubles, guards, session, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")
  const signedIn: { current: { user: { email: string; role: string; twoFactorEnabled: boolean } } | null } = { current: null }

  return {
    doubles: {
      recordNewsletterSubscriberErasedAudit: vi.fn<(email: string, options?: { resourceId?: string }) => void>(),
      recordNewsletterSubscriberUnsubscribedAudit: vi.fn<(email: string, options?: { resourceId?: string }) => void>(),
      scheduleRealtimeInvalidation: vi.fn<(input: unknown) => void>(),
    },
    guards: { permissions: [] as unknown[] },
    session: signedIn,
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
  }
})

vi.mock(import("@tanstack/react-start"), async (importOriginal) => {
  const actual = await importOriginal()
  const { withTestRpc } = await import("~/src/platform/testing/lib/server-function")

  return {
    ...actual,
    createServerFn: new Proxy(actual.createServerFn, {
      apply: (target, thisArg, args: unknown[]) => withTestRpc(Reflect.apply(target, thisArg, args)),
    }),
  }
})
vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getRequest: () => new Request("http://127.0.0.1:3000/en-US/admin/marketing/subscribers") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: () => Promise.resolve(session.current) }))
vi.mock(import("~/src/integrations/better-auth/auth.middleware"), async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    authorized: (permission?: Parameters<typeof actual.authorized>[0]) => {
      guards.permissions.push(permission)

      return actual.authorized(permission)
    },
  }
})
vi.mock("~/src/lib/rate-limit", () => ({ clientAddress: () => "203.0.113.7", withinRateLimit: () => Promise.resolve(true) }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server", () => ({
  publishRealtimeInvalidation: vi.fn(),
  scheduleRealtimeInvalidation: doubles.scheduleRealtimeInvalidation,
}))
vi.mock("~/src/modules/audit-log/use-cases/record-email-audit.server", () => ({
  recordNewsletterSubscriberErasedAudit: doubles.recordNewsletterSubscriberErasedAudit,
  recordNewsletterSubscriberUnsubscribedAudit: doubles.recordNewsletterSubscriberUnsubscribedAudit,
}))

const SUBSCRIBER = {
  ANNA: "0192f3a4-5b6c-7d8e-9fab-cdef01234561",
  BEN: "0192f3a4-5b6c-7d8e-9fab-cdef01234562",
  CARA: "0192f3a4-5b6c-7d8e-9fab-cdef01234563",
  NOBODY: "0192f3a4-5b6c-7d8e-9fab-cdef01234569",
} as const

const CONFIRMED_AT = 1_772_355_600_000

const UNSUBSCRIBED_AT = 1_772_442_000_000

const SUBSCRIBERS_REFRESH = { admin: [NEWSLETTER_QUERY_KEYS.ADMIN.PAGE, NEWSLETTER_QUERY_KEYS.ADMIN.STATS] }

const AUDIT_LOG_REFRESH = { admin: [AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, AUDIT_LOG_QUERY_KEYS.ADMIN.STATS] }

const subscriberRow = z.object({
  confirmed_at: z.number().nullable(),
  email: z.string(),
  status: z.string(),
  token: z.string(),
  unsubscribed_at: z.number().nullable(),
})

const readSubscriber = (id: string): z.infer<typeof subscriberRow> | undefined => {
  const row = sqlite.prepare("select confirmed_at, email, status, token, unsubscribed_at from newsletter_subscriber where id = ?").get(id)

  return row === undefined ? undefined : subscriberRow.parse(row)
}

const auditEntrySchema = z.array(z.object({ id: z.string() }))

const remainingAuditEntries = (): string[] =>
  auditEntrySchema.parse(sqlite.prepare("select id from audit_log order by id").all()).map(({ id }) => id)

const seedAuditEntry = ({ action, id, metadata, resourceId }: SeededAuditEntry): void => {
  sqlite
    .prepare(
      "insert into audit_log (id, action, actor_name, actor_role, category, created_at, metadata, resource_id, severity, target) values (?, ?, 'System', 'system', 'email', 0, ?, ?, 'info', ?)",
    )
    .run(id, action, metadata === undefined ? null : JSON.stringify(metadata), resourceId, resourceId)
}

const seedSubscriber = ({ confirmedAt, email, id, status, unsubscribedAt }: SeededSubscriber): void => {
  sqlite
    .prepare(
      "insert into newsletter_subscriber (id, email, status, source, locale, token, confirmed_at, unsubscribed_at, created_at, updated_at) values (?, ?, ?, 'landing', 'pl-PL', ?, ?, ?, 0, 0)",
    )
    .run(id, email, status, `token-${id}`, confirmedAt ?? null, unsubscribedAt ?? null)
}

const signInAs = (role: string): void => {
  session.current = { user: { email: "owner@martebizuteria.pl", role, twoFactorEnabled: true } }
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  sqlite.exec("delete from newsletter_subscriber; delete from audit_log;")
  signInAs(ROLES.ADMIN)
  seedSubscriber({ confirmedAt: CONFIRMED_AT, email: "anna@example.com", id: SUBSCRIBER.ANNA, status: "confirmed" })
  seedSubscriber({ email: "ben@example.com", id: SUBSCRIBER.BEN, status: "pending" })
  seedSubscriber({ email: "cara@example.com", id: SUBSCRIBER.CARA, status: "unsubscribed", unsubscribedAt: UNSUBSCRIBED_AT })
})

afterAll(() => {
  sqlite.close()
})

describe("subscriber admin action permissions", () => {
  it("lets only a customer manager unsubscribe and only a customer deleter erase", () => {
    expect(guards.permissions).toStrictEqual([{ user: ["delete"] }, { user: ["update"] }])
  })
})

describe("unsubscribeNewsletterSubscriber", () => {
  it("unsubscribes a confirmed subscriber the way their own link does, keeping when they confirmed", async () => {
    const before = Date.now()

    await expect(unsubscribeNewsletterSubscriber({ data: { id: SUBSCRIBER.ANNA } })).resolves.toStrictEqual({ unsubscribed: true })

    const anna = readSubscriber(SUBSCRIBER.ANNA)
    expect(anna).toMatchObject({ confirmed_at: CONFIRMED_AT, status: "unsubscribed", token: `token-${SUBSCRIBER.ANNA}` })
    expect(anna?.unsubscribed_at).toBeGreaterThanOrEqual(before)
  })

  it("records the unsubscribe against the address and refreshes open subscriber lists", async () => {
    await unsubscribeNewsletterSubscriber({ data: { id: SUBSCRIBER.ANNA } })

    expect(doubles.recordNewsletterSubscriberUnsubscribedAudit).toHaveBeenCalledExactlyOnceWith("anna@example.com")
    expect(doubles.scheduleRealtimeInvalidation).toHaveBeenCalledExactlyOnceWith(SUBSCRIBERS_REFRESH)
  })

  it("stops a pending sign-up from ever being confirmed by its link", async () => {
    await unsubscribeNewsletterSubscriber({ data: { id: SUBSCRIBER.BEN } })

    await expect(confirmNewsletterSubscription({ data: { token: `token-${SUBSCRIBER.BEN}` } })).resolves.toStrictEqual({
      email: undefined,
      result: NEWSLETTER_TOKEN_RESULT.INVALID,
    })
    expect(readSubscriber(SUBSCRIBER.BEN)).toMatchObject({ confirmed_at: null, status: "unsubscribed" })
  })

  it("leaves an address that already left as it was, without a second audit entry", async () => {
    await expect(unsubscribeNewsletterSubscriber({ data: { id: SUBSCRIBER.CARA } })).resolves.toStrictEqual({ unsubscribed: false })

    expect(readSubscriber(SUBSCRIBER.CARA)).toMatchObject({ status: "unsubscribed", unsubscribed_at: UNSUBSCRIBED_AT })
    expect(doubles.recordNewsletterSubscriberUnsubscribedAudit).not.toHaveBeenCalled()
    expect(doubles.scheduleRealtimeInvalidation).not.toHaveBeenCalled()
  })

  it("says the subscriber is gone when nobody has that id", async () => {
    await expect(unsubscribeNewsletterSubscriber({ data: { id: SUBSCRIBER.NOBODY } })).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      message: NEWSLETTER_ERROR_CODES.SUBSCRIBER_NOT_FOUND,
    })
    expect(doubles.recordNewsletterSubscriberUnsubscribedAudit).not.toHaveBeenCalled()
  })

  it("refuses an id that is not a subscriber id", async () => {
    await expect(unsubscribeNewsletterSubscriber({ data: { id: "anna@example.com" } })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
    })
  })

  it("refuses a customer and a visitor without a session, leaving the subscription alone", async () => {
    signInAs(ROLES.CUSTOMER)
    await expect(unsubscribeNewsletterSubscriber({ data: { id: SUBSCRIBER.ANNA } })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })

    session.current = null
    await expect(unsubscribeNewsletterSubscriber({ data: { id: SUBSCRIBER.ANNA } })).rejects.toMatchObject({
      code: ERROR_CODES.UNAUTHORIZED,
    })

    expect(readSubscriber(SUBSCRIBER.ANNA)).toMatchObject({ status: "confirmed", unsubscribed_at: null })
  })

  it("unsubscribes through the mutation options under its own key", async () => {
    expect(unsubscribeNewsletterSubscriberMutation.mutationKey).toStrictEqual(NEWSLETTER_MUTATION_KEYS.UNSUBSCRIBE_SUBSCRIBER)
    await expect(
      unsubscribeNewsletterSubscriberMutation.mutationFn?.({ id: SUBSCRIBER.BEN }, { client: new QueryClient(), meta: undefined }),
    ).resolves.toStrictEqual({ unsubscribed: true })
  })
})

describe("eraseNewsletterSubscriber", () => {
  it("deletes only that subscriber's record", async () => {
    await expect(eraseNewsletterSubscriber({ data: { id: SUBSCRIBER.ANNA } })).resolves.toBeUndefined()

    expect(readSubscriber(SUBSCRIBER.ANNA)).toBeUndefined()
    expect(readSubscriber(SUBSCRIBER.BEN)).toMatchObject({ email: "ben@example.com" })
    expect(readSubscriber(SUBSCRIBER.CARA)).toMatchObject({ email: "cara@example.com" })
  })

  it("records the erasure against the address and refreshes open subscriber lists and audit logs", async () => {
    await eraseNewsletterSubscriber({ data: { id: SUBSCRIBER.CARA } })

    expect(doubles.recordNewsletterSubscriberErasedAudit).toHaveBeenCalledExactlyOnceWith("cara@example.com")
    expect(doubles.scheduleRealtimeInvalidation.mock.calls).toStrictEqual([[SUBSCRIBERS_REFRESH], [AUDIT_LOG_REFRESH]])
  })

  it("deletes the audit entries about the address's newsletter emails, consent and unsubscribing, and keeps every other entry", async () => {
    seedAuditEntry({ action: "newsletter.subscriber_confirmed", id: "anna-confirmed", resourceId: "anna@example.com" })
    seedAuditEntry({ action: "newsletter.subscriber_unsubscribed", id: "anna-unsubscribed", resourceId: "anna@example.com" })
    seedAuditEntry({
      action: "email.failed",
      id: "anna-confirmation-failed",
      metadata: { emailKind: "newsletter-confirmation" },
      resourceId: "anna@example.com",
    })
    seedAuditEntry({
      action: "email.failed",
      id: "anna-notice-failed",
      metadata: { emailKind: "newsletter-already-subscribed" },
      resourceId: "anna@example.com",
    })
    seedAuditEntry({
      action: "email.failed",
      id: "anna-daily-limit",
      metadata: { dailyLimit: 50, emailKind: "newsletter-subscription" },
      resourceId: "anna@example.com",
    })
    seedAuditEntry({
      action: "email.failed",
      id: "anna-verification-failed",
      metadata: { emailKind: "verification" },
      resourceId: "anna@example.com",
    })
    seedAuditEntry({ action: "email.failed", id: "anna-failed-without-kind", resourceId: "anna@example.com" })
    seedAuditEntry({ action: "newsletter.subscriber_erased", id: "anna-erased-before", resourceId: "anna@example.com" })
    seedAuditEntry({ action: "customer.registered", id: "anna-registered", resourceId: "anna@example.com" })
    seedAuditEntry({ action: "newsletter.subscriber_confirmed", id: "ben-confirmed", resourceId: "ben@example.com" })
    seedAuditEntry({ action: "newsletter.subscriber_unsubscribed", id: "ben-unsubscribed", resourceId: "ben@example.com" })
    seedAuditEntry({
      action: "email.failed",
      id: "ben-confirmation-failed",
      metadata: { emailKind: "newsletter-confirmation" },
      resourceId: "ben@example.com",
    })

    await eraseNewsletterSubscriber({ data: { id: SUBSCRIBER.ANNA } })

    expect(remainingAuditEntries()).toStrictEqual([
      "anna-erased-before",
      "anna-failed-without-kind",
      "anna-registered",
      "anna-verification-failed",
      "ben-confirmation-failed",
      "ben-confirmed",
      "ben-unsubscribed",
    ])
  })

  it("also deletes the consent entries the subscription left under its account's earlier address while the account held it", async () => {
    sqlite.exec(`
      delete from user;
      insert into user (id, name, email, created_at, updated_at) values ('user-anna', 'Anna', 'anna.old@example.com', 0, 0);
      update user set email = 'anna@example.com' where id = 'user-anna';
      update user_email_history set replaced_at = 1000 where user_id = 'user-anna' and replaced_at is not null;
      update newsletter_subscriber set user_id = 'user-anna' where id = '${SUBSCRIBER.ANNA}';
    `)
    seedAuditEntry({ action: "newsletter.subscriber_confirmed", id: "anna-confirmed-at-old-address", resourceId: "anna.old@example.com" })
    sqlite.exec(`
      insert into audit_log (id, action, actor_name, actor_role, category, created_at, resource_id, severity, target)
      values ('next-holder-confirmed', 'newsletter.subscriber_confirmed', 'System', 'system', 'email', 2000, 'anna.old@example.com', 'info', 'anna.old@example.com');
    `)

    await eraseNewsletterSubscriber({ data: { id: SUBSCRIBER.ANNA } })

    expect(remainingAuditEntries()).toStrictEqual(["next-holder-confirmed"])
  })

  it("says the subscriber is gone when the record was already erased, deleting nothing else", async () => {
    await eraseNewsletterSubscriber({ data: { id: SUBSCRIBER.ANNA } })
    vi.clearAllMocks()
    seedAuditEntry({ action: "newsletter.subscriber_unsubscribed", id: "anna-unsubscribed", resourceId: "anna@example.com" })

    await expect(eraseNewsletterSubscriber({ data: { id: SUBSCRIBER.ANNA } })).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      message: NEWSLETTER_ERROR_CODES.SUBSCRIBER_NOT_FOUND,
    })
    expect(doubles.recordNewsletterSubscriberErasedAudit).not.toHaveBeenCalled()
    expect(doubles.scheduleRealtimeInvalidation).not.toHaveBeenCalled()
    expect(remainingAuditEntries()).toStrictEqual(["anna-unsubscribed"])
  })

  it("refuses a customer and a visitor without a session, keeping the record", async () => {
    signInAs(ROLES.CUSTOMER)
    await expect(eraseNewsletterSubscriber({ data: { id: SUBSCRIBER.ANNA } })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })

    session.current = null
    await expect(eraseNewsletterSubscriber({ data: { id: SUBSCRIBER.ANNA } })).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })

    expect(readSubscriber(SUBSCRIBER.ANNA)).toMatchObject({ status: "confirmed" })
  })

  it("erases through the mutation options under its own key", async () => {
    expect(eraseNewsletterSubscriberMutation.mutationKey).toStrictEqual(NEWSLETTER_MUTATION_KEYS.ERASE_SUBSCRIBER)
    await expect(
      eraseNewsletterSubscriberMutation.mutationFn?.({ id: SUBSCRIBER.BEN }, { client: new QueryClient(), meta: undefined }),
    ).resolves.toBeUndefined()
    expect(readSubscriber(SUBSCRIBER.BEN)).toBeUndefined()
  })
})

interface SeededAuditEntry {
  readonly action: string
  readonly id: string
  readonly metadata?: Record<string, unknown>
  readonly resourceId: string
}

interface SeededSubscriber {
  readonly confirmedAt?: number
  readonly email: string
  readonly id: string
  readonly status: string
  readonly unsubscribedAt?: number
}
