import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { NEWSLETTER_MUTATION_KEYS, NEWSLETTER_QUERY_KEYS } from "~/src/modules/newsletter/newsletter.constants"

import { getOwnNewsletterSubscription, getOwnNewsletterSubscriptionQuery } from "../get-own-newsletter-subscription"
import { unsubscribeOwnNewsletter, unsubscribeOwnNewsletterMutation } from "../unsubscribe-own-newsletter"

const CALLER_EMAIL = "Anna@Example.COM"

const accessors = vi.hoisted(() => ({
  getSubscriberByEmail: vi.fn<(email: string) => Promise<{ id: string; status: string } | undefined>>(),
  updateSubscriberById: vi.fn<(id: string, values: Record<string, unknown>) => Promise<void>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { limit: 5, windowSeconds: 60 } },
  authorized: () => ({}),
  withRateLimit: () => ({}),
}))
vi.mock("~/src/modules/newsletter/newsletter.accessors", () => ({
  getSubscriberByEmail: accessors.getSubscriberByEmail,
  normalizeSubscriberEmail: (email: string) => email.trim().toLowerCase(),
  updateSubscriberById: accessors.updateSubscriberById,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: unknown }) => unknown) => () =>
        handler({ context: { auth: { user: { email: CALLER_EMAIL, id: "user-1" } } } }),
      middleware: () => builder,
      validator: () => builder,
    }

    return builder
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  accessors.updateSubscriberById.mockResolvedValue(undefined)
})

describe("getOwnNewsletterSubscription", () => {
  it("looks the caller up by their own address, normalised", async () => {
    accessors.getSubscriberByEmail.mockResolvedValue({ id: "sub-1", status: "confirmed" })

    await expect(getOwnNewsletterSubscription()).resolves.toStrictEqual({ status: "confirmed" })
    expect(accessors.getSubscriberByEmail).toHaveBeenCalledWith("anna@example.com")
  })

  it("reports no status for someone who never signed up", async () => {
    accessors.getSubscriberByEmail.mockResolvedValue(undefined)

    await expect(getOwnNewsletterSubscription()).resolves.toStrictEqual({ status: undefined })
  })

  it("is cached under its own key", () => {
    expect(getOwnNewsletterSubscriptionQuery().queryKey).toStrictEqual(NEWSLETTER_QUERY_KEYS.OWN_SUBSCRIPTION)
  })
})

describe("unsubscribeOwnNewsletter", () => {
  it("takes a confirmed subscriber off the list and dates it", async () => {
    accessors.getSubscriberByEmail.mockResolvedValue({ id: "sub-1", status: "confirmed" })

    await expect(unsubscribeOwnNewsletter()).resolves.toStrictEqual({ unsubscribed: true })
    expect(accessors.updateSubscriberById.mock.calls[0]?.[0]).toBe("sub-1")
    expect(accessors.updateSubscriberById.mock.calls[0]?.[1]).toMatchObject({ status: "unsubscribed" })
  })

  it("takes a pending signup off the list as well", async () => {
    accessors.getSubscriberByEmail.mockResolvedValue({ id: "sub-1", status: "pending" })

    await expect(unsubscribeOwnNewsletter()).resolves.toStrictEqual({ unsubscribed: true })
  })

  it("writes nothing for someone who is already off the list", async () => {
    accessors.getSubscriberByEmail.mockResolvedValue({ id: "sub-1", status: "unsubscribed" })

    await expect(unsubscribeOwnNewsletter()).resolves.toStrictEqual({ unsubscribed: false })
    expect(accessors.updateSubscriberById).not.toHaveBeenCalled()
  })

  it("writes nothing for someone who never signed up", async () => {
    accessors.getSubscriberByEmail.mockResolvedValue(undefined)

    await expect(unsubscribeOwnNewsletter()).resolves.toStrictEqual({ unsubscribed: false })
    expect(accessors.updateSubscriberById).not.toHaveBeenCalled()
  })

  it("is keyed so the account page can track it", () => {
    expect(unsubscribeOwnNewsletterMutation.mutationKey).toStrictEqual(NEWSLETTER_MUTATION_KEYS.UNSUBSCRIBE_OWN)
  })
})
