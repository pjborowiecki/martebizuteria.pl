import { QueryClient } from "@tanstack/react-query"
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:") }
})

const { getRequestSession, recordEmailFailedAudit, sendNewsletterAlreadySubscribed, sendNewsletterConfirmation } = vi.hoisted(() => ({
  getRequestSession: vi.fn<() => Promise<{ user: { email: string; id: string } } | undefined>>(),
  recordEmailFailedAudit: vi.fn<(target: string, options?: { detail?: string }) => void>(),
  sendNewsletterAlreadySubscribed: vi.fn<(input: { email: string; locale: string }) => Promise<string | undefined>>(),
  sendNewsletterConfirmation: vi.fn<(input: { email: string; locale: string; token: string }) => Promise<string | undefined>>(),
}))

const UNVERIFIED_DOMAIN = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

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
vi.mock("~/src/integrations/resend/newsletter-already-subscribed.server", () => ({ sendNewsletterAlreadySubscribed }))
vi.mock("~/src/integrations/resend/newsletter-confirmation.server", () => ({ sendNewsletterConfirmation }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "pl-PL" }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordEmailFailedAudit }))
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

import {
  NEWSLETTER_MUTATION_KEYS,
  NEWSLETTER_OUTCOME,
  NEWSLETTER_STATUS,
  NEWSLETTER_TOKEN_RESULT,
} from "~/src/modules/newsletter/newsletter.constants"
import {
  confirmNewsletterSubscription,
  confirmNewsletterSubscriptionMutation,
} from "~/src/modules/newsletter/use-cases/confirm-newsletter-subscription"
import { subscribeToNewsletter, subscribeToNewsletterMutation } from "~/src/modules/newsletter/use-cases/subscribe-to-newsletter"
import {
  unsubscribeFromNewsletter,
  unsubscribeFromNewsletterMutation,
} from "~/src/modules/newsletter/use-cases/unsubscribe-from-newsletter"

const mutationContext = { client: new QueryClient(), meta: undefined }

const subscriberRow = (email: string) =>
  z
    .object({ email: z.string(), status: z.string(), token: z.string(), user_id: z.string().nullable() })
    .nullable()
    .parse(sqlite.prepare("select email, status, token, user_id from newsletter_subscriber where email = ?").get(email) ?? null)

const countSubscribers = (): number =>
  z.object({ total: z.number() }).parse(sqlite.prepare("select count(*) as total from newsletter_subscriber").get()).total

const lastConfirmationToken = (): string =>
  z.object({ token: z.string() }).parse({ token: sendNewsletterConfirmation.mock.calls.at(-1)?.[0]?.token }).token

const confirmAnna = async () => {
  await subscribeToNewsletter({ data: { email: "anna@example.com" } })
  await confirmNewsletterSubscription({ data: { token: lastConfirmationToken() } })
}

const failNextConfirmation = () => {
  sendNewsletterConfirmation.mockResolvedValueOnce(UNVERIFIED_DOMAIN)

  return vi.spyOn(console, "error").mockImplementation(() => {})
}

beforeEach(() => {
  vi.clearAllMocks()
  getRequestSession.mockResolvedValue(undefined)
  sendNewsletterAlreadySubscribed.mockResolvedValue(undefined)
  sendNewsletterConfirmation.mockResolvedValue(undefined)
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

afterEach(() => {
  vi.restoreAllMocks()
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
    await confirmAnna()

    await expect(subscribeToNewsletter({ data: { email: "anna@example.com" } })).resolves.toStrictEqual({
      outcome: NEWSLETTER_OUTCOME.CONFIRMATION_SENT,
    })
  })

  it("mails a confirmed subscriber who is not signed in that they are already on the list", async () => {
    await confirmAnna()

    await subscribeToNewsletter({ data: { email: "anna@example.com", locale: "en-US" } })

    expect(sendNewsletterAlreadySubscribed).toHaveBeenCalledExactlyOnceWith({ email: "anna@example.com", locale: "en-US" })
    expect(sendNewsletterConfirmation).toHaveBeenCalledOnce()
  })

  it("keeps a confirmed subscriber's token so the links in letters already sent keep working", async () => {
    await confirmAnna()
    const token = subscriberRow("anna@example.com")?.token

    await subscribeToNewsletter({ data: { email: "anna@example.com" } })

    expect(subscriberRow("anna@example.com")?.token).toBe(token)
  })

  it("tells the signed-in owner of that address that they are already subscribed", async () => {
    await confirmAnna()
    getRequestSession.mockResolvedValue({ user: { email: "anna@example.com", id: "user-1" } })

    await expect(subscribeToNewsletter({ data: { email: "anna@example.com" } })).resolves.toStrictEqual({
      outcome: NEWSLETTER_OUTCOME.ALREADY_CONFIRMED,
    })
    expect(sendNewsletterAlreadySubscribed).not.toHaveBeenCalled()
  })

  it("leaves a confirmed subscription confirmed when someone else submits the address", async () => {
    await confirmAnna()

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

describe("subscribeToNewsletter when the confirmation email cannot be sent", () => {
  it("waits for the confirmation email before answering", async () => {
    const delivery = Promise.withResolvers<string | undefined>()
    sendNewsletterConfirmation.mockReturnValueOnce(delivery.promise)
    const settled = vi.fn<() => void>()

    const subscribing = subscribeToNewsletter({ data: { email: "anna@example.com" } }).then(settled)
    await vi.waitFor(() => {
      expect(sendNewsletterConfirmation).toHaveBeenCalledOnce()
    })

    expect(settled).not.toHaveBeenCalled()
    delivery.resolve(undefined)
    await subscribing
    expect(settled).toHaveBeenCalledOnce()
  })

  it("reports confirmationFailed and keeps the address pending", async () => {
    failNextConfirmation()

    await expect(subscribeToNewsletter({ data: { email: "anna@example.com" } })).resolves.toStrictEqual({
      outcome: NEWSLETTER_OUTCOME.CONFIRMATION_FAILED,
    })
    expect(subscriberRow("anna@example.com")?.status).toBe(NEWSLETTER_STATUS.PENDING)
  })

  it("records the failed confirmation in the email audit log for the shop", async () => {
    const consoleError = failNextConfirmation()

    await subscribeToNewsletter({ data: { email: "anna@example.com" } })

    expect(recordEmailFailedAudit).toHaveBeenCalledExactlyOnceWith("anna@example.com", {
      detail: `Newsletter confirmation — ${UNVERIFIED_DOMAIN}`,
    })
    expect(consoleError).toHaveBeenCalledExactlyOnceWith(
      `[Newsletter] Failed to send confirmation to anna@example.com: ${UNVERIFIED_DOMAIN}`,
    )
  })

  it("audits nothing when the confirmation went out", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    await subscribeToNewsletter({ data: { email: "anna@example.com" } })

    expect(recordEmailFailedAudit).not.toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
  })

  it("sends again with a fresh token when the visitor retries", async () => {
    failNextConfirmation()
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })
    const failedToken = lastConfirmationToken()

    await expect(subscribeToNewsletter({ data: { email: "anna@example.com" } })).resolves.toStrictEqual({
      outcome: NEWSLETTER_OUTCOME.CONFIRMATION_SENT,
    })
    expect(sendNewsletterConfirmation).toHaveBeenCalledTimes(2)
    expect(lastConfirmationToken()).not.toBe(failedToken)
    expect(lastConfirmationToken()).toBe(subscriberRow("anna@example.com")?.token)
  })

  it("reports and audits a failed already-subscribed notice instead of claiming it went out", async () => {
    await confirmAnna()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    sendNewsletterAlreadySubscribed.mockResolvedValueOnce(UNVERIFIED_DOMAIN)

    await expect(subscribeToNewsletter({ data: { email: "anna@example.com" } })).resolves.toStrictEqual({
      outcome: NEWSLETTER_OUTCOME.CONFIRMATION_FAILED,
    })
    expect(recordEmailFailedAudit).toHaveBeenCalledExactlyOnceWith("anna@example.com", {
      detail: `Newsletter already-subscribed notice — ${UNVERIFIED_DOMAIN}`,
    })
    expect(consoleError).toHaveBeenCalledExactlyOnceWith(
      `[Newsletter] Failed to send already-subscribed notice to anna@example.com: ${UNVERIFIED_DOMAIN}`,
    )
    expect(subscriberRow("anna@example.com")?.status).toBe(NEWSLETTER_STATUS.CONFIRMED)
  })

  it("answers a confirmed address exactly like a new one while no email can be sent", async () => {
    await confirmAnna()
    vi.spyOn(console, "error").mockImplementation(() => {})
    sendNewsletterAlreadySubscribed.mockResolvedValue(UNVERIFIED_DOMAIN)
    sendNewsletterConfirmation.mockResolvedValue(UNVERIFIED_DOMAIN)

    const member = await subscribeToNewsletter({ data: { email: "anna@example.com" } })
    const stranger = await subscribeToNewsletter({ data: { email: "jan@example.com" } })

    expect(member).toStrictEqual({ outcome: NEWSLETTER_OUTCOME.CONFIRMATION_FAILED })
    expect(stranger).toStrictEqual(member)
  })

  it("reports a failed send to someone rejoining after leaving the list", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })
    await unsubscribeFromNewsletter({ data: { token: lastConfirmationToken() } })
    failNextConfirmation()

    await expect(subscribeToNewsletter({ data: { email: "anna@example.com" } })).resolves.toStrictEqual({
      outcome: NEWSLETTER_OUTCOME.CONFIRMATION_FAILED,
    })
    expect(subscriberRow("anna@example.com")?.status).toBe(NEWSLETTER_STATUS.PENDING)
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

describe("newsletter mutation options", () => {
  it("signs a visitor up through the mutation the signup forms run", async () => {
    await expect(
      subscribeToNewsletterMutation.mutationFn?.({ email: "anna@example.com", locale: "en-US", source: "checkout" }, mutationContext),
    ).resolves.toStrictEqual({ outcome: NEWSLETTER_OUTCOME.CONFIRMATION_SENT })
    expect(subscriberRow("anna@example.com")?.status).toBe(NEWSLETTER_STATUS.PENDING)
    expect(sendNewsletterConfirmation).toHaveBeenCalledWith(expect.objectContaining({ email: "anna@example.com", locale: "en-US" }))
  })

  it("confirms the subscription through the mutation the confirmation page runs", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })

    await expect(
      confirmNewsletterSubscriptionMutation.mutationFn?.({ token: lastConfirmationToken() }, mutationContext),
    ).resolves.toStrictEqual({
      email: "anna@example.com",
      result: NEWSLETTER_TOKEN_RESULT.OK,
    })
    expect(subscriberRow("anna@example.com")?.status).toBe(NEWSLETTER_STATUS.CONFIRMED)
  })

  it("unsubscribes through the mutation the unsubscribe page runs", async () => {
    await subscribeToNewsletter({ data: { email: "anna@example.com" } })

    await expect(
      unsubscribeFromNewsletterMutation.mutationFn?.({ token: lastConfirmationToken() }, mutationContext),
    ).resolves.toStrictEqual({
      email: "anna@example.com",
      result: NEWSLETTER_TOKEN_RESULT.OK,
    })
    expect(subscriberRow("anna@example.com")?.status).toBe(NEWSLETTER_STATUS.UNSUBSCRIBED)
  })

  it("keys each mutation under the newsletter feature", () => {
    expect(subscribeToNewsletterMutation.mutationKey).toStrictEqual(NEWSLETTER_MUTATION_KEYS.SUBSCRIBE)
    expect(confirmNewsletterSubscriptionMutation.mutationKey).toStrictEqual(NEWSLETTER_MUTATION_KEYS.CONFIRM)
    expect(unsubscribeFromNewsletterMutation.mutationKey).toStrictEqual(NEWSLETTER_MUTATION_KEYS.UNSUBSCRIBE)
  })
})
