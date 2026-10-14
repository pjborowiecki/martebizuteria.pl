import { createElement } from "react"

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

const { cache, emailsSend, recordEmailFailedAudit } = vi.hoisted(() => {
  const entries = new Map<string, string>()

  return {
    cache: {
      entries,
      get: (key: string) => Promise.resolve(entries.get(key) ?? null),
      put: (key: string, value: string) => {
        entries.set(key, value)

        return Promise.resolve()
      },
    },
    emailsSend: vi.fn<(email: { readonly to: string }, options: object) => Promise<unknown>>(),
    recordEmailFailedAudit: vi.fn<(target: string, options?: { detail?: string; metadata?: Record<string, unknown> }) => void>(),
  }
})

vi.mock("cloudflare:workers", () => ({
  env: {
    APP_ENV: "test",
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
    CACHE: cache,
    RESEND_API_KEY: "re_test",
    RESEND_EMAIL_FROM: "atelier@marte.test",
  },
}))
vi.mock("resend", () => ({
  Resend: class {
    public readonly emails = { send: emailsSend }
  },
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordAuthLoginAudit: vi.fn(),
  recordAuthPasswordResetAudit: vi.fn(),
  recordCustomerDeletedAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  recordEmailFailedAudit,
  resolveAuthAuditActor: vi.fn(),
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminAuditLogInvalidation: vi.fn(),
  scheduleAdminCustomersInvalidation: vi.fn(),
}))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: {} }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { auth } from "~/src/integrations/better-auth/auth.server"
import {
  PUBLIC_EMAILS_DAILY_MAX,
  PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX,
} from "~/src/integrations/resend/resend.public-email-limits.server"
import { sendEmail } from "~/src/integrations/resend/resend.send"

const PASSWORD = "Sup3rSecret!"

const SENDER_FLAG = "email-sender-unavailable:test"

const ACCEPTED = { data: { id: "email_1" }, error: null }

const DOMAIN_NOT_VERIFIED = {
  data: null,
  error: {
    message: "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains",
    name: "validation_error",
    statusCode: 403,
  },
}

const errorBody = z.object({ code: z.string(), message: z.string() })

const clientAddress = { next: 0 }

const post = (path: string, body: object, cookie?: string): Promise<Response> => {
  clientAddress.next += 1

  return auth.handler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "cf-connecting-ip": `198.51.100.${String(clientAddress.next)}`,
        ...(cookie === undefined ? {} : { cookie }),
      },
      method: "POST",
    }),
  )
}

const signUp = (email: string): Promise<Response> => post("/sign-up/email", { email, name: "Anna Kowalska", password: PASSWORD })

const countUsers = (): number => z.object({ total: z.number() }).parse(sqlite.prepare("select count(*) as total from user").get()).total

const isVerified = (email: string): boolean =>
  z.object({ verified: z.number() }).parse(sqlite.prepare("select email_verified as verified from user where email = ?").get(email))
    .verified === 1

const sessionCookie = (response: Response): string =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ")

const waitForSenderFlag = async () => {
  await vi.waitFor(() => {
    expect(cache.entries.has(SENDER_FLAG)).toBe(true)
  })
}

const waitForRefusalAudit = async (email: string) => {
  await vi.waitFor(() => {
    expect(recordEmailFailedAudit).toHaveBeenCalledWith(email, expect.anything())
  })
}

const refuseNewsletterConfirmation = async () => {
  emailsSend.mockResolvedValueOnce(DOMAIN_NOT_VERIFIED)
  await sendEmail({ react: createElement("p", undefined, "Confirm your subscription"), subject: "Confirm", to: "visitor@example.com" })
  await waitForSenderFlag()
}

const requestReset = (email: string): Promise<Response> => post("/request-password-reset", { email })

const fillTodaysPublicEmails = () => {
  sqlite
    .prepare(
      "insert into rate_limit (id, key, count, last_request) values (?, ?, ?, ?) on conflict (key) do update set count = excluded.count",
    )
    .run("public-email-day", "public-email:test:daily", PUBLIC_EMAILS_DAILY_MAX, Date.now())
}

const waitForSends = async (count: number) => {
  await vi.waitFor(() => {
    expect(emailsSend).toHaveBeenCalledTimes(count)
  })
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  sqlite.exec("delete from user; delete from verification; delete from rate_limit;")
  cache.entries.clear()
  emailsSend.mockReset()
  emailsSend.mockResolvedValue(ACCEPTED)
  recordEmailFailedAudit.mockReset()
  vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  vi.spyOn(console, "log").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(() => {
  sqlite.close()
})

describe("auth emails when Resend refuses them", () => {
  it("answers a resend-verification request with a retryable 503 when the send is refused", async () => {
    await signUp("anna@example.com")
    await waitForSends(1)
    emailsSend.mockResolvedValue(DOMAIN_NOT_VERIFIED)

    const response = await post("/send-verification-email", { email: "anna@example.com" })

    expect(response.status).toBe(503)
    expect(errorBody.parse(await response.json()).code).toBe("EMAIL_DELIVERY_FAILED")
    expect(recordEmailFailedAudit).toHaveBeenCalledWith("anna@example.com", {
      detail: DOMAIN_NOT_VERIFIED.error.message,
      metadata: { emailKind: "verification" },
    })
  })

  it("never lets a refused reset for an existing account change the answer the next address gets", async () => {
    await signUp("anna@example.com")
    await waitForSends(1)
    emailsSend.mockResolvedValue(DOMAIN_NOT_VERIFIED)

    const before = await post("/request-password-reset", { email: "nobody@example.com" })
    const known = await post("/request-password-reset", { email: "anna@example.com" })
    await waitForRefusalAudit("anna@example.com")
    const after = await post("/request-password-reset", { email: "someone-else@example.com" })

    const beforeBody: unknown = await before.json()

    expect([before.status, known.status, after.status]).toStrictEqual([200, 200, 200])
    expect(await known.json()).toStrictEqual(beforeBody)
    expect(await after.json()).toStrictEqual(beforeBody)
    expect(cache.entries.has(SENDER_FLAG)).toBe(false)
  })

  it("answers known and unknown addresses identically once another email has marked the sender unavailable", async () => {
    await signUp("anna@example.com")
    await waitForSends(1)
    await refuseNewsletterConfirmation()

    const known = await post("/request-password-reset", { email: "anna@example.com" })
    const unknown = await post("/request-password-reset", { email: "nobody@example.com" })

    expect([known.status, unknown.status]).toStrictEqual([503, 503])
    const knownBody = errorBody.parse(await known.json())

    expect(knownBody.code).toBe("EMAIL_DELIVERY_UNAVAILABLE")
    expect(errorBody.parse(await unknown.json())).toStrictEqual(knownBody)
    expect(emailsSend).toHaveBeenCalledTimes(2)
  })

  it("keeps password reset working when the sender flag cannot be read", async () => {
    await signUp("anna@example.com")
    await waitForSends(1)
    vi.spyOn(cache, "get").mockRejectedValueOnce(new Error("KV GET failed: 503 Service Unavailable"))

    const response = await post("/request-password-reset", { email: "anna@example.com" })

    expect(response.status).toBe(200)
    await waitForSends(2)
    expect(emailsSend).toHaveBeenLastCalledWith(expect.objectContaining({ to: "anna@example.com" }), {})
  })

  it("creates no account while the sender is unavailable", async () => {
    cache.entries.set(SENDER_FLAG, DOMAIN_NOT_VERIFIED.error.message)

    const response = await signUp("anna@example.com")

    expect(response.status).toBe(503)
    expect(errorBody.parse(await response.json()).code).toBe("EMAIL_DELIVERY_UNAVAILABLE")
    expect(countUsers()).toBe(0)
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it("keeps the generic sign-up answer for a first refused send, then a resend succeeds once delivery recovers", async () => {
    emailsSend.mockResolvedValue(DOMAIN_NOT_VERIFIED)

    const signUpResponse = await signUp("anna@example.com")

    expect(signUpResponse.status).toBe(200)
    await waitForRefusalAudit("anna@example.com")
    expect(isVerified("anna@example.com")).toBe(false)
    expect(cache.entries.has(SENDER_FLAG)).toBe(false)

    emailsSend.mockResolvedValue(ACCEPTED)
    const resend = await post("/send-verification-email", { email: "anna@example.com" })

    expect(resend.status).toBe(200)
    expect(emailsSend).toHaveBeenLastCalledWith(expect.objectContaining({ to: "anna@example.com" }), {})
  })

  it("keeps account deletion successful when the goodbye email, linked to the address the deletion came in on, is refused", async () => {
    await signUp("anna@example.com")
    await waitForSends(1)
    sqlite.prepare("update user set email_verified = 1 where email = ?").run("anna@example.com")
    const signIn = await post("/sign-in/email", { email: "anna@example.com", password: PASSWORD })
    emailsSend.mockResolvedValue(DOMAIN_NOT_VERIFIED)

    const response = await post("/delete-user", { password: PASSWORD }, sessionCookie(signIn))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true })
    expect(countUsers()).toBe(0)
    expect(emailsSend.mock.lastCall?.[0]).toMatchObject({ react: { props: { storefrontUrl: "http://localhost:3000/en-US" } } })
    expect(recordEmailFailedAudit).toHaveBeenCalledWith("anna@example.com", {
      detail: DOMAIN_NOT_VERIFIED.error.message,
      metadata: { emailKind: "account-deleted" },
    })
  })
})

describe("auth emails anyone can request", () => {
  it("answers a reset request past the hourly limit for an account exactly like one for no account, and sends nothing", async () => {
    await signUp("anna@example.com")
    await waitForSends(1)
    for (let sent = 1; sent <= PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX; sent += 1) {
      await requestReset("anna@example.com")
      await waitForSends(1 + sent)
    }

    const unknown = await requestReset("nobody@example.com")
    const limited = await requestReset("anna@example.com")

    expect(limited.status).toBe(200)
    expect(await limited.json()).toStrictEqual(await unknown.json())
    await vi.waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith(
        "[Email] Skipped a password-reset email to anna@example.com: the address reached its hourly limit for this email",
      )
    })
    expect(emailsSend).toHaveBeenCalledTimes(1 + PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX)
  })

  it("answers a resend-verification request past the hourly limit with success and sends nothing", async () => {
    await signUp("anna@example.com")
    for (let sent = 2; sent <= PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX; sent += 1) {
      await post("/send-verification-email", { email: "anna@example.com" })
    }
    await waitForSends(PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX)

    const limited = await post("/send-verification-email", { email: "anna@example.com" })

    expect(limited.status).toBe(200)
    expect(await limited.json()).toStrictEqual({ status: true })
    expect(emailsSend).toHaveBeenCalledTimes(PUBLIC_EMAILS_PER_RECIPIENT_HOURLY_MAX)
  })

  it("still creates the account once the shop has sent its emails for the day, so a resend can reach it later", async () => {
    fillTodaysPublicEmails()

    const response = await signUp("anna@example.com")

    expect(response.status).toBe(200)
    expect(countUsers()).toBe(1)
    await waitForRefusalAudit("anna@example.com")
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it("keeps sending the emails the shop sends on its own, such as an order confirmation, after visitors used up the day", async () => {
    await signUp("anna@example.com")
    await waitForSends(1)
    fillTodaysPublicEmails()

    await requestReset("anna@example.com")
    await waitForRefusalAudit("anna@example.com")
    const failure = await sendEmail({ react: createElement("p", undefined, "Order confirmed"), subject: "Order", to: "buyer@example.com" })

    expect(failure).toBeUndefined()
    expect(emailsSend).toHaveBeenCalledTimes(2)
    expect(emailsSend).toHaveBeenLastCalledWith(expect.objectContaining({ to: "buyer@example.com" }), {})
  })
})
