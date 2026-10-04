import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { cache, env } = vi.hoisted(() => {
  const entries = new Map<string, string>()
  const kv = {
    entries,
    get: vi.fn((key: string) => Promise.resolve(entries.get(key) ?? null)),
    put: vi.fn((key: string, value: string) => {
      entries.set(key, value)

      return Promise.resolve()
    }),
  }

  return { cache: kv, env: { APP_ENV: "preview", CACHE: kv } }
})

vi.mock("cloudflare:workers", () => ({ env }))

import {
  EMAIL_SENDER_UNAVAILABLE_SECONDS,
  isEmailSenderUnavailable,
  markEmailSenderUnavailable,
} from "~/src/integrations/resend/resend.availability.server"

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

beforeEach(() => {
  vi.clearAllMocks()
  cache.entries.clear()
  env.APP_ENV = "preview"
})

describe("email sender availability", () => {
  it("treats the sender as available until a refusal is recorded", async () => {
    await expect(isEmailSenderUnavailable()).resolves.toBe(false)
  })

  it("remembers a refusal that affects every email", async () => {
    await markEmailSenderUnavailable(DOMAIN_NOT_VERIFIED)

    await expect(isEmailSenderUnavailable()).resolves.toBe(true)
  })

  it("keeps the refusal for five minutes, so a fixed sender is tried again soon", async () => {
    await markEmailSenderUnavailable(DOMAIN_NOT_VERIFIED)

    expect(EMAIL_SENDER_UNAVAILABLE_SECONDS).toBe(300)
    expect(cache.put).toHaveBeenCalledWith("email-sender-unavailable:preview", DOMAIN_NOT_VERIFIED, {
      expirationTtl: EMAIL_SENDER_UNAVAILABLE_SECONDS,
    })
  })

  it("writes the flag once while a refusal is already recorded, sparing the KV write limits", async () => {
    await markEmailSenderUnavailable(DOMAIN_NOT_VERIFIED)
    await markEmailSenderUnavailable("You have reached your daily email sending quota")

    expect(cache.put).toHaveBeenCalledOnce()
    expect(cache.entries.get("email-sender-unavailable:preview")).toBe(DOMAIN_NOT_VERIFIED)
  })

  it("treats the sender as available when the flag cannot be read, so sign-up and password reset keep working", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const outage = new Error("KV GET failed: 503 Service Unavailable")
    cache.get.mockRejectedValueOnce(outage)

    await expect(isEmailSenderUnavailable()).resolves.toBe(false)

    expect(log).toHaveBeenCalledWith("[Resend] Email sender availability unreadable", outage)
  })

  it("keeps environments that share a namespace apart", async () => {
    env.APP_ENV = "development"
    await markEmailSenderUnavailable(DOMAIN_NOT_VERIFIED)
    env.APP_ENV = "preview"

    await expect(isEmailSenderUnavailable()).resolves.toBe(false)
  })
})
