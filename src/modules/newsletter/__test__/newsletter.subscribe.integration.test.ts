import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

const { getRequestSession, scheduleBackgroundWork, sendNewsletterConfirmation } = vi.hoisted(() => ({
  getRequestSession: vi.fn<() => Promise<{ user: { email: string; id: string } } | undefined>>(),
  scheduleBackgroundWork: vi.fn(),
  sendNewsletterConfirmation: vi.fn<(input: { email: string; locale: string; token: string }) => Promise<void>>(),
}))

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { max: 3, window: 60 } },
  withRateLimit: () => ({}),
}))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession }))
vi.mock("~/src/integrations/resend/newsletter-confirmation.server", () => ({ sendNewsletterConfirmation }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "pl-PL" }))
vi.mock("~/src/lib/background", () => ({ scheduleBackgroundWork }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (fn: (ctx: { data: unknown }) => unknown) => (input: { data: unknown }) => fn({ data: input.data }),
      middleware: () => builder,
      validator: (parse: (input: unknown) => unknown) => {
        const next = {
          handler: (fn: (ctx: { data: unknown }) => unknown) => (input: { data: unknown }) => fn({ data: parse(input.data) }),
        }

        return next
      },
    }

    return builder
  },
}))

import { NEWSLETTER_OUTCOME, NEWSLETTER_STATUS, NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter/newsletter.constants"
import { confirmNewsletterSubscription } from "~/src/modules/newsletter/use-cases/confirm-newsletter-subscription"
import { subscribeToNewsletter } from "~/src/modules/newsletter/use-cases/subscribe-to-newsletter"
import { unsubscribeFromNewsletter } from "~/src/modules/newsletter/use-cases/unsubscribe-from-newsletter"

const subscriberRow = (email: string) =>
  z
    .object({ email: z.string(), status: z.string(), token: z.string(), user_id: z.string().nullable() })
    .nullable()
    .parse(sqlite.prepare("select email, status, token, user_id from newsletter_subscriber where email = ?").get(email) ?? null)

const countSubscribers = (): number =>
  z.object({ total: z.number() }).parse(sqlite.prepare("select count(*) as total from newsletter_subscriber").get()).total

const lastConfirmationToken = (): string =>
  z.object({ token: z.string() }).parse({ token: sendNewsletterConfirmation.mock.calls.at(-1)?.[0]?.token }).token

beforeEach(() => {
  vi.clearAllMocks()
  getRequestSession.mockResolvedValue(undefined)
  sendNewsletterConfirmation.mockResolvedValue(undefined)
  scheduleBackgroundWork.mockImplementation((promise: Promise<unknown>) => promise)
  sqlite.exec(`
    drop table if exists newsletter_subscriber;
    create table newsletter_subscriber (
      id text primary key, email text not null, status text not null, source text not null, locale text not null,
      token text not null, user_id text, confirmed_at integer, unsubscribed_at integer,
      created_at integer not null, updated_at integer not null
    );
    create unique index newsletter_subscriber_email_unique on newsletter_subscriber (email);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("subscribeToNewsletter", () => {
  it("records a new address as pending, never as subscribed outright", async () => {
    await expect(subscribeToNewsletter({ data: { email: "anna@example.com" } })).resolves.toStrictEqual({
      outcome: NEWSLETTER_OUTCOME.CONFIRMATION_SENT,
    })
    expect(subscriberRow("anna@example.com")?.status).toBe(NEWSLETTER_STATUS.PENDING)
  })

  it("sends a confirmation mail carrying the stored token", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })

    expect(sendNewsletterConfirmation).toHaveBeenCalledOnce()
    expect(lastConfirmationToken()).toBe(subscriberRow("anna@example.com")?.token)
  })

  it("stores the address lower-cased so one person cannot join twice by casing", async () => {
    await subscribeToNewsletter({ data: { email: "Anna@Example.COM" } })
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })

    expect(countSubscribers()).toBe(1)
    expect(subscriberRow("anna@example.com")?.email).toBe("anna@example.com")
  })

  it("issues a fresh token on a repeat request so an older link cannot be replayed", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })
    const first = subscriberRow("anna@example.com")?.token

    await subscribeToNewsletter({ data: { email: "anna@example.com" } })

    expect(subscriberRow("anna@example.com")?.token).not.toBe(first)
  })

  it("does not disclose that a confirmed address is on the list", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })
    await confirmNewsletterSubscription({ data: { token: lastConfirmationToken() } })

    await expect(subscribeToNewsletter({ data: { email: "anna@example.com" } })).resolves.toStrictEqual({
      outcome: NEWSLETTER_OUTCOME.CONFIRMATION_SENT,
    })
  })

  it("tells the signed-in owner of that address that they are already subscribed", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })
    await confirmNewsletterSubscription({ data: { token: lastConfirmationToken() } })
    getRequestSession.mockResolvedValue({ user: { email: "anna@example.com", id: "user-1" } })

    await expect(subscribeToNewsletter({ data: { email: "anna@example.com" } })).resolves.toStrictEqual({
      outcome: NEWSLETTER_OUTCOME.ALREADY_CONFIRMED,
    })
  })

  it("leaves a confirmed subscription confirmed when someone else submits the address", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })
    await confirmNewsletterSubscription({ data: { token: lastConfirmationToken() } })

    await subscribeToNewsletter({ data: { email: "anna@example.com" } })

    expect(subscriberRow("anna@example.com")?.status).toBe(NEWSLETTER_STATUS.CONFIRMED)
  })

  it("lets someone who left the list start over", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })
    await unsubscribeFromNewsletter({ data: { token: lastConfirmationToken() } })

    await subscribeToNewsletter({ data: { email: "anna@example.com" } })

    expect(subscriberRow("anna@example.com")?.status).toBe(NEWSLETTER_STATUS.PENDING)
  })

  it("attaches the subscription to a signed-in customer", async () => {
    getRequestSession.mockResolvedValue({ user: { email: "anna@example.com", id: "user-1" } })
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })

    expect(subscriberRow("anna@example.com")?.user_id).toBe("user-1")
  })

  it("refuses an address that is not an email", () => {
    expect(() => {
      void subscribeToNewsletter({ data: { email: "not-an-email" } })
    }).toThrow()
  })
})

describe("confirmNewsletterSubscription", () => {
  it("confirms a pending subscription and reports the address back", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })

    await expect(confirmNewsletterSubscription({ data: { token: lastConfirmationToken() } })).resolves.toStrictEqual({
      email: "anna@example.com",
      result: NEWSLETTER_TOKEN_RESULT.OK,
    })
    expect(subscriberRow("anna@example.com")?.status).toBe(NEWSLETTER_STATUS.CONFIRMED)
  })

  it("is harmless to follow the link twice", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })
    const token = lastConfirmationToken()
    await confirmNewsletterSubscription({ data: { token } })

    await expect(confirmNewsletterSubscription({ data: { token } })).resolves.toMatchObject({
      result: NEWSLETTER_TOKEN_RESULT.ALREADY_DONE,
    })
  })

  it("reveals nothing for a token that matches no subscription", async () => {
    await expect(confirmNewsletterSubscription({ data: { token: "0".repeat(36) } })).resolves.toStrictEqual({
      email: undefined,
      result: NEWSLETTER_TOKEN_RESULT.INVALID,
    })
  })

  it("will not resurrect a subscription that was unsubscribed", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })
    const token = lastConfirmationToken()
    await unsubscribeFromNewsletter({ data: { token } })

    await expect(confirmNewsletterSubscription({ data: { token } })).resolves.toMatchObject({
      result: NEWSLETTER_TOKEN_RESULT.INVALID,
    })
    expect(subscriberRow("anna@example.com")?.status).toBe(NEWSLETTER_STATUS.UNSUBSCRIBED)
  })
})

describe("unsubscribeFromNewsletter", () => {
  it("removes a confirmed subscriber from the list", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })
    const token = lastConfirmationToken()
    await confirmNewsletterSubscription({ data: { token } })

    await expect(unsubscribeFromNewsletter({ data: { token } })).resolves.toStrictEqual({
      email: "anna@example.com",
      result: NEWSLETTER_TOKEN_RESULT.OK,
    })
    expect(subscriberRow("anna@example.com")?.status).toBe(NEWSLETTER_STATUS.UNSUBSCRIBED)
  })

  it("works straight from a pending subscription, without confirming first", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })

    await expect(unsubscribeFromNewsletter({ data: { token: lastConfirmationToken() } })).resolves.toMatchObject({
      result: NEWSLETTER_TOKEN_RESULT.OK,
    })
  })

  it("keeps the row rather than deleting it, so the decision stays on record", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })
    await unsubscribeFromNewsletter({ data: { token: lastConfirmationToken() } })

    expect(countSubscribers()).toBe(1)
  })

  it("is harmless to follow the link twice", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })
    const token = lastConfirmationToken()
    await unsubscribeFromNewsletter({ data: { token } })

    await expect(unsubscribeFromNewsletter({ data: { token } })).resolves.toMatchObject({
      result: NEWSLETTER_TOKEN_RESULT.ALREADY_DONE,
    })
  })

  it("reveals nothing for a token that matches no subscription", async () => {
    await expect(unsubscribeFromNewsletter({ data: { token: "0".repeat(36) } })).resolves.toStrictEqual({
      email: undefined,
      result: NEWSLETTER_TOKEN_RESULT.INVALID,
    })
  })
})
