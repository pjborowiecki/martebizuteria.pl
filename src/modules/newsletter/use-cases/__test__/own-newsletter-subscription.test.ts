import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { NEWSLETTER_MUTATION_KEYS, NEWSLETTER_QUERY_KEYS, NEWSLETTER_QUERY_STALE_MS } from "~/src/modules/newsletter/newsletter.constants"

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

  it("keeps the status fresh for the newsletter window", () => {
    expect(getOwnNewsletterSubscriptionQuery().staleTime).toBe(NEWSLETTER_QUERY_STALE_MS)
  })

  it("fetches the caller's status through the server function", async () => {
    accessors.getSubscriberByEmail.mockResolvedValue({ id: "sub-1", status: "pending" })

    await expect(
      getOwnNewsletterSubscriptionQuery().queryFn?.({
        client: new QueryClient(),
        meta: undefined,
        queryKey: NEWSLETTER_QUERY_KEYS.OWN_SUBSCRIPTION,
        signal: new AbortController().signal,
      }),
    ).resolves.toStrictEqual({ status: "pending" })
    expect(accessors.getSubscriberByEmail).toHaveBeenCalledWith("anna@example.com")
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

  it("unsubscribes the caller through the mutation the account page runs", async () => {
    accessors.getSubscriberByEmail.mockResolvedValue({ id: "sub-1", status: "confirmed" })

    await expect(
      unsubscribeOwnNewsletterMutation.mutationFn?.(undefined, { client: new QueryClient(), meta: undefined }),
    ).resolves.toStrictEqual({
      unsubscribed: true,
    })
    expect(accessors.updateSubscriberById).toHaveBeenCalledWith("sub-1", expect.objectContaining({ status: "unsubscribed" }))
  })
})
