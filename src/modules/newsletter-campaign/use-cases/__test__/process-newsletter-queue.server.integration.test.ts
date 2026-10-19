import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { NEWSLETTER_BATCH_SIZE, NEWSLETTER_RETRY_DELAY_SECONDS } from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"

const { doubles, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    doubles: {
      publishRealtimeInvalidation: vi.fn<(input: unknown) => Promise<void>>(),
      queueSend: vi.fn<(message: unknown, options: unknown) => Promise<void>>(),
      recordEmailFailedAudit: vi.fn<(target: string, options?: { detail?: string; metadata?: Record<string, unknown> }) => void>(),
      sendIncidentAlert: vi.fn<(incident: unknown) => Promise<void>>(),
      sendNewsletterBatch:
        vi.fn<
          (batch: {
            content: unknown
            idempotencyKey?: string
            recipients: readonly NewsletterCampaign["recipient"][]
          }) => Promise<string | undefined>
        >(),
    },
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
  }
})

vi.mock("cloudflare:workers", () => ({ env: { NEWSLETTER_QUEUE: { send: doubles.queueSend } } }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server", () => ({
  publishRealtimeInvalidation: doubles.publishRealtimeInvalidation,
}))
vi.mock("~/src/lib/incident-alert.server", () => ({ sendIncidentAlert: doubles.sendIncidentAlert }))
vi.mock("~/src/modules/newsletter-campaign/use-cases/send-newsletter-batch.server", () => ({
  sendNewsletterBatch: doubles.sendNewsletterBatch,
}))
vi.mock("~/src/modules/audit-log/use-cases/record-email-audit.server", () => ({
  recordEmailFailedAudit: doubles.recordEmailFailedAudit,
}))

const { enqueueNewsletterCampaign, processNewsletterQueueBatch } =
  await import("~/src/modules/newsletter-campaign/use-cases/process-newsletter-queue.server")

const CAMPAIGN_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const RESEND_REFUSAL = "The martebizuteria.pl domain is not verified"

const LETTER = {
  bodies: { "en-US": "New rings are in.", "pl-PL": "Nowe pierścionki już są." },
  origin: "https://martebizuteria.pl",
  subjects: { "en-US": "Autumn pieces", "pl-PL": "Jesienne projekty" },
}

const campaignSchema = z.object({
  completed_at: z.number().nullable(),
  failure: z.string().nullable(),
  last_recipient_id: z.string().nullable(),
  sent_count: z.number(),
  status: z.string(),
})

const readCampaign = () => campaignSchema.parse(sqlite.prepare("select * from newsletter_campaign where id = ?").get(CAMPAIGN_ID))

const subscriberId = (index: number): string => `subscriber-${String(index).padStart(4, "0")}`

const seedSubscribers = (count: number, status = "confirmed", from = 0): void => {
  const insert = sqlite.prepare(
    "insert into newsletter_subscriber (id, email, status, source, locale, token, created_at, updated_at) values (?, ?, ?, 'landing', ?, ?, 0, 0)",
  )
  for (let index = from; index < from + count; index += 1) {
    insert.run(
      subscriberId(index),
      `${subscriberId(index)}@example.test`,
      status,
      index % 2 === 0 ? "pl-PL" : "en-US",
      `token-${subscriberId(index)}`,
    )
  }
}

const seedCampaign = (status = "sending", lastRecipientId: string | null = null): void => {
  sqlite
    .prepare(
      "insert into newsletter_campaign (id, subjects, bodies, origin, status, recipient_count, last_recipient_id) values (?, ?, ?, ?, ?, 3, ?)",
    )
    .run(CAMPAIGN_ID, JSON.stringify(LETTER.subjects), JSON.stringify(LETTER.bodies), LETTER.origin, status, lastRecipientId)
}

const queueMessage = (attempts = 1) => ({
  ack: vi.fn<() => void>(),
  attempts,
  body: { campaignId: CAMPAIGN_ID },
  id: "message-1",
  retry: vi.fn<(options?: QueueRetryOptions) => void>(),
  timestamp: new Date(),
})

const deliver = async (message: ReturnType<typeof queueMessage>): Promise<void> => {
  await processNewsletterQueueBatch({
    ackAll: () => {},
    messages: [message],
    metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
    queue: "martebizuteria-newsletter-test",
    retryAll: () => {},
  })
}

const sentRecipients = (call: number) => doubles.sendNewsletterBatch.mock.calls[call]?.[0]?.recipients

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  sqlite.exec("delete from newsletter_campaign; delete from newsletter_subscriber;")
  doubles.sendIncidentAlert.mockResolvedValue()
  doubles.publishRealtimeInvalidation.mockResolvedValue()
  doubles.queueSend.mockResolvedValue()
  doubles.sendNewsletterBatch.mockResolvedValue(undefined)
})

afterAll(() => {
  sqlite.close()
})

describe("enqueueNewsletterCampaign", () => {
  it("queues the campaign as json a moment from now", async () => {
    await enqueueNewsletterCampaign(CAMPAIGN_ID)

    expect(doubles.queueSend).toHaveBeenCalledWith({ campaignId: CAMPAIGN_ID }, { contentType: "json", delaySeconds: 1 })
  })
})

describe("processNewsletterQueueBatch", () => {
  it("sends the letter to every confirmed subscriber in their own language with their unsubscribe token", async () => {
    seedSubscribers(2)
    seedSubscribers(1, "pending", 2)
    seedSubscribers(1, "unsubscribed", 3)
    seedCampaign()
    const message = queueMessage()

    await deliver(message)

    expect(doubles.sendNewsletterBatch).toHaveBeenCalledOnce()
    expect(doubles.sendNewsletterBatch.mock.calls[0]?.[0]).toMatchObject({ content: LETTER, idempotencyKey: `newsletter-${CAMPAIGN_ID}` })
    expect(sentRecipients(0)).toStrictEqual([
      { email: "subscriber-0000@example.test", locale: "pl-PL", unsubscribeToken: "token-subscriber-0000" },
      { email: "subscriber-0001@example.test", locale: "en-US", unsubscribeToken: "token-subscriber-0001" },
    ])
    expect(message.ack).toHaveBeenCalledOnce()
  })

  it("marks a campaign sent once a batch smaller than the limit goes out, without queueing another", async () => {
    seedSubscribers(2)
    seedCampaign()

    await deliver(queueMessage())

    expect(readCampaign()).toMatchObject({ failure: null, last_recipient_id: subscriberId(1), sent_count: 2, status: "sent" })
    expect(readCampaign().completed_at).toBeTypeOf("number")
    expect(doubles.queueSend).not.toHaveBeenCalled()
    expect(doubles.publishRealtimeInvalidation).toHaveBeenCalledWith({ admin: [["admin", "newsletter-campaign", "list"]] })
  })

  it("sends a full batch, queues the next and carries on after the last subscriber it reached", async () => {
    seedSubscribers(NEWSLETTER_BATCH_SIZE + 1)
    seedCampaign()

    await deliver(queueMessage())

    expect(sentRecipients(0)).toHaveLength(NEWSLETTER_BATCH_SIZE)
    expect(readCampaign()).toMatchObject({
      last_recipient_id: subscriberId(NEWSLETTER_BATCH_SIZE - 1),
      sent_count: NEWSLETTER_BATCH_SIZE,
      status: "sending",
    })
    expect(doubles.queueSend).toHaveBeenCalledWith({ campaignId: CAMPAIGN_ID }, { contentType: "json", delaySeconds: 1 })

    await deliver(queueMessage())

    expect(sentRecipients(1)?.map((recipient) => recipient.email)).toStrictEqual([`${subscriberId(NEWSLETTER_BATCH_SIZE)}@example.test`])
    expect(doubles.sendNewsletterBatch.mock.calls[1]?.[0]?.idempotencyKey).toBe(
      `newsletter-${CAMPAIGN_ID}-after-${subscriberId(NEWSLETTER_BATCH_SIZE - 1)}`,
    )
    expect(readCampaign()).toMatchObject({ sent_count: NEWSLETTER_BATCH_SIZE + 1, status: "sent" })
  })

  it("finishes without sending when the last full batch reached everyone", async () => {
    seedSubscribers(1)
    seedCampaign("sending", subscriberId(0))
    const message = queueMessage()

    await deliver(message)

    expect(doubles.sendNewsletterBatch).not.toHaveBeenCalled()
    expect(readCampaign()).toMatchObject({ sent_count: 0, status: "sent" })
    expect(message.ack).toHaveBeenCalledOnce()
  })

  it("never sends the same subscribers twice when a message arrives again", async () => {
    seedSubscribers(2)
    seedCampaign()

    await deliver(queueMessage())
    const repeated = queueMessage()
    await deliver(repeated)

    expect(doubles.sendNewsletterBatch).toHaveBeenCalledOnce()
    expect(readCampaign().sent_count).toBe(2)
    expect(repeated.ack).toHaveBeenCalledOnce()
  })
})

describe("processNewsletterQueueBatch on a campaign that has finished or moved on", () => {
  it.each(["sent", "failed"])("acknowledges a message for a %s campaign without sending", async (status) => {
    seedSubscribers(1)
    seedCampaign(status)
    const message = queueMessage()

    await deliver(message)

    expect(doubles.sendNewsletterBatch).not.toHaveBeenCalled()
    expect(message.ack).toHaveBeenCalledOnce()
  })

  it("acknowledges a message for a campaign that does not exist", async () => {
    const message = queueMessage()

    await deliver(message)

    expect(doubles.sendNewsletterBatch).not.toHaveBeenCalled()
    expect(message.ack).toHaveBeenCalledOnce()
  })

  it("does not queue another batch when a parallel delivery already moved the campaign on", async () => {
    seedSubscribers(NEWSLETTER_BATCH_SIZE + 1)
    seedCampaign()
    doubles.sendNewsletterBatch.mockImplementationOnce(() => {
      sqlite
        .prepare("update newsletter_campaign set last_recipient_id = ? where id = ?")
        .run(subscriberId(NEWSLETTER_BATCH_SIZE - 1), CAMPAIGN_ID)

      return Promise.resolve(undefined)
    })

    await deliver(queueMessage())

    expect(readCampaign().sent_count).toBe(0)
    expect(doubles.queueSend).not.toHaveBeenCalled()
  })
})

describe("processNewsletterQueueBatch when sending fails", () => {
  it("retries a batch Resend refused while attempts remain, leaving the campaign sending", async () => {
    seedSubscribers(1)
    seedCampaign()
    doubles.sendNewsletterBatch.mockResolvedValue(RESEND_REFUSAL)
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const message = queueMessage(2)

    await deliver(message)

    expect(message.retry).toHaveBeenCalledWith({ delaySeconds: NEWSLETTER_RETRY_DELAY_SECONDS })
    expect(message.ack).not.toHaveBeenCalled()
    expect(readCampaign()).toMatchObject({ sent_count: 0, status: "sending" })
    expect(doubles.sendIncidentAlert).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledOnce()
  })

  it("stops the campaign on the last attempt, records why and tells the admin", async () => {
    seedSubscribers(1)
    seedCampaign()
    doubles.sendNewsletterBatch.mockResolvedValue(RESEND_REFUSAL)
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const message = queueMessage(3)

    await deliver(message)

    expect(readCampaign()).toMatchObject({ failure: RESEND_REFUSAL, sent_count: 0, status: "failed" })
    expect(readCampaign().completed_at).toBeTypeOf("number")
    expect(doubles.recordEmailFailedAudit).toHaveBeenCalledWith(CAMPAIGN_ID, {
      detail: RESEND_REFUSAL,
      metadata: { emailKind: "newsletter-campaign" },
    })
    expect(doubles.sendIncidentAlert).toHaveBeenCalledExactlyOnceWith({
      detail: RESEND_REFUSAL,
      kind: "newsletterFailed",
      reference: CAMPAIGN_ID,
    })
    expect(doubles.publishRealtimeInvalidation).toHaveBeenCalledOnce()
    expect(message.ack).toHaveBeenCalledOnce()
    expect(message.retry).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledOnce()
  })

  it("retries when the next batch cannot be queued, and the retry carries on after the subscribers already reached", async () => {
    seedSubscribers(NEWSLETTER_BATCH_SIZE + 1)
    seedCampaign()
    doubles.queueSend.mockRejectedValueOnce(new Error("Queue unavailable"))
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const message = queueMessage()

    await deliver(message)

    expect(message.retry).toHaveBeenCalledWith({ delaySeconds: NEWSLETTER_RETRY_DELAY_SECONDS })
    expect(warn.mock.calls[0]?.[0]).toContain("Queue unavailable")

    await deliver(queueMessage(2))

    expect(sentRecipients(1)?.map((recipient) => recipient.email)).toStrictEqual([`${subscriberId(NEWSLETTER_BATCH_SIZE)}@example.test`])
    expect(readCampaign()).toMatchObject({ sent_count: NEWSLETTER_BATCH_SIZE + 1, status: "sent" })
  })

  it("retries a message whose failure is not an Error", async () => {
    seedSubscribers(1)
    seedCampaign()
    doubles.sendNewsletterBatch.mockRejectedValueOnce("socket closed")
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const message = queueMessage()

    await deliver(message)

    expect(message.retry).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]?.[0]).toContain("socket closed")
  })
})
