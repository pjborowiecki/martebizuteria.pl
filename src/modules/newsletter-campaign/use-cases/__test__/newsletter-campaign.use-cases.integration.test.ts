import { QueryClient } from "@tanstack/react-query"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getNewsletterCampaignById } from "~/src/modules/newsletter-campaign/newsletter-campaign.accessors"
import {
  ADMIN_NEWSLETTER_CAMPAIGNS_LIMIT,
  NEWSLETTER_CAMPAIGN_ERROR_CODES,
  NEWSLETTER_CAMPAIGN_MUTATION_KEYS,
  NEWSLETTER_CAMPAIGN_QUERY_KEYS,
  NEWSLETTER_CAMPAIGN_QUERY_STALE_MS,
} from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"
import {
  getAdminNewsletterCampaigns,
  getAdminNewsletterCampaignsQuery,
} from "~/src/modules/newsletter-campaign/use-cases/get-admin-newsletter-campaigns"
import {
  sendNewsletterCampaign,
  sendNewsletterCampaignMutation,
} from "~/src/modules/newsletter-campaign/use-cases/send-newsletter-campaign"
import { sendNewsletterTest, sendNewsletterTestMutation } from "~/src/modules/newsletter-campaign/use-cases/send-newsletter-test"

const { doubles, session, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")
  const signedIn: { current: { user: { email: string; role: string; twoFactorEnabled: boolean } } | null } = { current: null }

  return {
    doubles: {
      queueSend: vi.fn<(message: unknown, options: unknown) => Promise<void>>(),
      recordEmailFailedAudit: vi.fn<(target: string, options?: { detail?: string; metadata?: Record<string, unknown> }) => void>(),
      recordNewsletterSentAudit: vi.fn<(subject: string, options?: unknown) => void>(),
      scheduleRealtimeInvalidation: vi.fn<(input: unknown) => void>(),
      sendNewsletterBatch:
        vi.fn<
          (batch: {
            content: unknown
            idempotencyKey?: string
            recipients: readonly NewsletterCampaign["recipient"][]
          }) => Promise<string | undefined>
        >(),
    },
    session: signedIn,
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
  }
})

vi.mock("cloudflare:workers", () => ({ env: { NEWSLETTER_QUEUE: { send: doubles.queueSend } } }))
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

  return { ...actual, getRequest: () => new Request("http://127.0.0.1:3000/en-US/admin/marketing/new") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: () => Promise.resolve(session.current) }))
vi.mock("~/src/lib/rate-limit", () => ({}))
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
vi.mock("~/src/modules/newsletter-campaign/use-cases/send-newsletter-batch.server", () => ({
  sendNewsletterBatch: doubles.sendNewsletterBatch,
}))
vi.mock("~/src/modules/audit-log/use-cases/record-email-audit.server", () => ({
  recordEmailFailedAudit: doubles.recordEmailFailedAudit,
  recordNewsletterSentAudit: doubles.recordNewsletterSentAudit,
}))

const CAMPAIGN_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const ADMIN_EMAIL = "owner@martebizuteria.pl"

const LETTER = {
  bodies: { "en-US": "New rings are in.", "pl-PL": "Nowe pierścionki już są." },
  subjects: { "en-US": "Autumn pieces", "pl-PL": "Jesienne projekty" },
}

const ORIGIN = "http://127.0.0.1:3000"

const campaignCount = (): number =>
  z.object({ total: z.number() }).parse(sqlite.prepare("select count(*) as total from newsletter_campaign").get()).total

const seedSubscriber = (id: string, status: string): void => {
  sqlite
    .prepare(
      "insert into newsletter_subscriber (id, email, status, source, locale, token, created_at, updated_at) values (?, ?, ?, 'landing', 'pl-PL', ?, 0, 0)",
    )
    .run(id, `${id}@example.test`, status, `token-${id}`)
}

const seedCampaign = (id: string, createdAt: number, status = "sent"): void => {
  sqlite
    .prepare(
      "insert into newsletter_campaign (id, subjects, bodies, origin, status, recipient_count, sent_count, created_at) values (?, ?, ?, ?, ?, 4, 4, ?)",
    )
    .run(id, JSON.stringify({ "en-US": `Letter ${id}`, "pl-PL": `List ${id}` }), JSON.stringify(LETTER.bodies), ORIGIN, status, createdAt)
}

const signInAs = (role: string): void => {
  session.current = { user: { email: ADMIN_EMAIL, role, twoFactorEnabled: true } }
}

const send = () => sendNewsletterCampaign({ data: { ...LETTER, id: CAMPAIGN_ID } })

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  sqlite.exec("delete from newsletter_campaign; delete from newsletter_subscriber;")
  signInAs(ROLES.ADMIN)
  doubles.queueSend.mockResolvedValue()
  doubles.sendNewsletterBatch.mockResolvedValue(undefined)
})

afterAll(() => {
  sqlite.close()
})

describe("sendNewsletterCampaign", () => {
  it("records the campaign as sending to every confirmed subscriber and hands it to the queue", async () => {
    seedSubscriber("anna", "confirmed")
    seedSubscriber("ben", "confirmed")
    seedSubscriber("cara", "pending")

    await expect(send()).resolves.toStrictEqual({ recipientCount: 2 })

    await expect(getNewsletterCampaignById(CAMPAIGN_ID)).resolves.toMatchObject({
      ...LETTER,
      completedAt: null,
      failure: null,
      lastRecipientId: null,
      origin: ORIGIN,
      recipientCount: 2,
      sentCount: 0,
      status: "sending",
    })
    expect(doubles.queueSend).toHaveBeenCalledWith({ campaignId: CAMPAIGN_ID }, { contentType: "json", delaySeconds: 1 })
  })

  it("records the send in the audit log under the Polish subject and refreshes open admin lists", async () => {
    seedSubscriber("anna", "confirmed")

    await send()

    expect(doubles.recordNewsletterSentAudit).toHaveBeenCalledWith(LETTER.subjects["pl-PL"], {
      metadata: { recipientCount: 1 },
      resourceId: CAMPAIGN_ID,
    })
    expect(doubles.scheduleRealtimeInvalidation).toHaveBeenCalledWith({ admin: [NEWSLETTER_CAMPAIGN_QUERY_KEYS.ADMIN.LIST] })
  })

  it("refuses to send the same campaign twice", async () => {
    seedSubscriber("anna", "confirmed")
    await send()

    await expect(send()).rejects.toMatchObject({ code: ERROR_CODES.CONFLICT, message: NEWSLETTER_CAMPAIGN_ERROR_CODES.ALREADY_SENT })

    expect(campaignCount()).toBe(1)
    expect(doubles.queueSend).toHaveBeenCalledOnce()
    expect(doubles.recordNewsletterSentAudit).toHaveBeenCalledOnce()
  })

  it("refuses a campaign nobody has confirmed a subscription to receive", async () => {
    seedSubscriber("cara", "pending")

    await expect(send()).rejects.toMatchObject({ code: ERROR_CODES.CONFLICT, message: NEWSLETTER_CAMPAIGN_ERROR_CODES.NO_RECIPIENTS })

    expect(campaignCount()).toBe(0)
    expect(doubles.queueSend).not.toHaveBeenCalled()
  })

  it("forgets a campaign the queue refused, so the admin's retry under the same id sends it once", async () => {
    seedSubscriber("anna", "confirmed")
    doubles.queueSend.mockRejectedValueOnce(new Error("Queue unavailable"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(send()).rejects.toMatchObject({ code: ERROR_CODES.INTERNAL_ERROR })

    expect(campaignCount()).toBe(0)
    expect(doubles.recordNewsletterSentAudit).not.toHaveBeenCalled()
    expect(doubles.scheduleRealtimeInvalidation).not.toHaveBeenCalled()

    await expect(send()).resolves.toStrictEqual({ recipientCount: 1 })

    await expect(getNewsletterCampaignById(CAMPAIGN_ID)).resolves.toMatchObject({ failure: null, status: "sending" })
    expect(doubles.queueSend).toHaveBeenCalledTimes(2)
    expect(doubles.recordNewsletterSentAudit).toHaveBeenCalledOnce()
  })

  it("keeps a campaign that already reached subscribers when the queue reports its refusal too late", async () => {
    seedSubscriber("anna", "confirmed")
    doubles.queueSend.mockImplementationOnce(() => {
      sqlite.prepare("update newsletter_campaign set last_recipient_id = 'anna', sent_count = 1 where id = ?").run(CAMPAIGN_ID)

      return Promise.reject(new Error("Queue timed out"))
    })
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(send()).rejects.toMatchObject({ code: ERROR_CODES.INTERNAL_ERROR })

    await expect(getNewsletterCampaignById(CAMPAIGN_ID)).resolves.toMatchObject({
      lastRecipientId: "anna",
      sentCount: 1,
      status: "sending",
    })
    await expect(send()).rejects.toMatchObject({ code: ERROR_CODES.CONFLICT, message: NEWSLETTER_CAMPAIGN_ERROR_CODES.ALREADY_SENT })
  })

  it("refuses a customer and a visitor without a session before reading anything", async () => {
    seedSubscriber("anna", "confirmed")
    signInAs(ROLES.CUSTOMER)
    await expect(send()).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })

    session.current = null
    await expect(send()).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })

    expect(campaignCount()).toBe(0)
  })

  it("refuses a letter that fails validation", async () => {
    await expect(
      sendNewsletterCampaign({ data: { ...LETTER, bodies: { ...LETTER.bodies, "en-US": "[FAQ](/faq)" }, id: CAMPAIGN_ID } }),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
  })

  it("sends through the mutation options under the send key", async () => {
    seedSubscriber("anna", "confirmed")

    expect(sendNewsletterCampaignMutation.mutationKey).toStrictEqual(NEWSLETTER_CAMPAIGN_MUTATION_KEYS.SEND)
    await expect(
      sendNewsletterCampaignMutation.mutationFn?.({ ...LETTER, id: CAMPAIGN_ID }, { client: new QueryClient(), meta: undefined }),
    ).resolves.toStrictEqual({ recipientCount: 1 })
  })
})

describe("sendNewsletterTest", () => {
  it("sends both language versions to the admin's own address, without an unsubscribe token or a campaign", async () => {
    await expect(sendNewsletterTest({ data: LETTER })).resolves.toStrictEqual({ email: ADMIN_EMAIL })

    expect(doubles.sendNewsletterBatch).toHaveBeenCalledWith({
      content: { ...LETTER, origin: ORIGIN },
      recipients: [
        { email: ADMIN_EMAIL, locale: "pl-PL", unsubscribeToken: undefined },
        { email: ADMIN_EMAIL, locale: "en-US", unsubscribeToken: undefined },
      ],
    })
    expect(campaignCount()).toBe(0)
  })

  it("logs and audits a test Resend refused, and tells the admin it failed", async () => {
    doubles.sendNewsletterBatch.mockResolvedValue("Domain not verified")
    const error = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(sendNewsletterTest({ data: LETTER })).rejects.toMatchObject({ code: ERROR_CODES.INTERNAL_ERROR })

    expect(doubles.recordEmailFailedAudit).toHaveBeenCalledWith(ADMIN_EMAIL, {
      detail: "Domain not verified",
      metadata: { emailKind: "newsletter-test" },
    })
    expect(error.mock.calls[0]?.[0]).toBe(`[Newsletter] Failed to send the test newsletter to ${ADMIN_EMAIL}: Domain not verified`)
  })

  it("refuses a customer", async () => {
    signInAs(ROLES.CUSTOMER)

    await expect(sendNewsletterTest({ data: LETTER })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(doubles.sendNewsletterBatch).not.toHaveBeenCalled()
  })

  it("sends through the mutation options under the test key", async () => {
    expect(sendNewsletterTestMutation.mutationKey).toStrictEqual(NEWSLETTER_CAMPAIGN_MUTATION_KEYS.SEND_TEST)
    await expect(sendNewsletterTestMutation.mutationFn?.(LETTER, { client: new QueryClient(), meta: undefined })).resolves.toStrictEqual({
      email: ADMIN_EMAIL,
    })
  })
})

describe("getAdminNewsletterCampaigns", () => {
  it("lists the newest campaigns first with their progress, leaving out the letter and its links", async () => {
    seedCampaign("older", 1000)
    seedCampaign("newer", 2000, "sending")

    const campaigns = await getAdminNewsletterCampaigns()

    expect(campaigns.map((campaign) => campaign.id)).toStrictEqual(["newer", "older"])
    expect(campaigns[0]).toStrictEqual({
      completedAt: null,
      createdAt: new Date(2000),
      failure: null,
      id: "newer",
      recipientCount: 4,
      sentCount: 4,
      status: "sending",
      subjects: { "en-US": "Letter newer", "pl-PL": "List newer" },
    })
  })

  it("lists at most the most recent campaigns the admin page shows", async () => {
    for (let index = 0; index <= ADMIN_NEWSLETTER_CAMPAIGNS_LIMIT; index += 1) {
      seedCampaign(`campaign-${String(index)}`, index)
    }

    const campaigns = await getAdminNewsletterCampaigns()

    expect(campaigns).toHaveLength(ADMIN_NEWSLETTER_CAMPAIGNS_LIMIT)
    expect(campaigns.at(-1)?.id).toBe("campaign-1")
  })

  it("refuses a customer", async () => {
    signInAs(ROLES.CUSTOMER)

    await expect(getAdminNewsletterCampaigns()).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("caches the list under the admin campaigns key and fetches it through the server function", async () => {
    seedCampaign("only", 1000)
    const options = getAdminNewsletterCampaignsQuery()

    expect(options.queryKey).toStrictEqual(NEWSLETTER_CAMPAIGN_QUERY_KEYS.ADMIN.LIST)
    expect(options.staleTime).toBe(NEWSLETTER_CAMPAIGN_QUERY_STALE_MS)
    await expect(
      options.queryFn?.({ client: new QueryClient(), meta: undefined, queryKey: options.queryKey, signal: new AbortController().signal }),
    ).resolves.toHaveLength(1)
  })
})
