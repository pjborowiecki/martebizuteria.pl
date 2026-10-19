import { type ReactElement } from "react"

import { createEmailVerificationToken } from "better-auth/api"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import {
  AUTH_BASE_URL,
  type AuthBrowser,
  CUSTOMER_PASSWORD,
  createPasswordCustomer,
  openAuthBrowser,
} from "~/src/platform/testing/lib/auth-browser"
import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { auth } from "~/src/integrations/better-auth/auth.server"

import changeEmailCopy from "~/messages/en-US/emails.change-email.json"
import emailChangedCopy from "~/messages/en-US/emails.email-changed.json"
import resetPasswordCopy from "~/messages/en-US/emails.reset-password.json"
import verifyEmailCopy from "~/messages/en-US/emails.verify-email.json"

interface SentEmail {
  readonly react: ReactElement<Record<string, unknown>>
  readonly subject: string
  readonly to: string
}

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

const stubs = vi.hoisted(() => ({
  sendEmail: vi.fn<(email: SentEmail) => Promise<string | undefined>>(),
  updateCustomer: vi.fn<(customerId: string, values: { email: string }) => Promise<object>>(),
}))

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: stubs.sendEmail }))
vi.mock("~/src/integrations/resend/resend.availability.server", () => ({ isEmailSenderUnavailable: () => Promise.resolve(false) }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { customers: { update: stubs.updateCustomer } } }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminAuditLogInvalidation: vi.fn(),
  scheduleAdminCustomersInvalidation: vi.fn(),
  scheduleAdminNewsletterSubscribersInvalidation: vi.fn(),
}))
vi.mock("~/src/modules/audit-log/use-cases/record-auth-audit.server", async () => ({
  ...(await vi.importActual("~/src/modules/audit-log/use-cases/record-auth-audit.server")),
  recordAuthEmailChangedAudit: vi.fn(),
  recordAuthEmailVerifiedAudit: vi.fn(),
  recordAuthLoginAudit: vi.fn(),
  recordAuthPasswordResetAudit: vi.fn(),
}))
vi.mock("~/src/modules/audit-log/use-cases/record-customer-audit.server", async () => ({
  ...(await vi.importActual("~/src/modules/audit-log/use-cases/record-customer-audit.server")),
  recordCustomerOrdersClaimedAudit: vi.fn(),
  recordCustomerRegisteredAudit: vi.fn(),
  recordCustomerStripeEmailFailedAudit: vi.fn(),
}))
vi.mock("~/src/modules/audit-log/use-cases/record-email-audit.server", async () => ({
  ...(await vi.importActual("~/src/modules/audit-log/use-cases/record-email-audit.server")),
  recordEmailFailedAudit: vi.fn(),
  recordEmailSentAudit: vi.fn(),
}))
vi.mock(import("~/src/modules/newsletter-subscriber/newsletter-subscriber.address-change.server"), async (importOriginal) => {
  const { followAccountAddressChange } = await importOriginal()

  return { followAccountAddressChange: vi.fn(followAccountAddressChange) }
})
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const authAudit = await import("~/src/modules/audit-log/use-cases/record-auth-audit.server")

const customerAudit = await import("~/src/modules/audit-log/use-cases/record-customer-audit.server")

const emailAudit = await import("~/src/modules/audit-log/use-cases/record-email-audit.server")

const newsletter = await import("~/src/modules/newsletter-subscriber/newsletter-subscriber.address-change.server")

const HOUR_MS = 3_600_000

const ELEVEN_MINUTES_MS = 660_000

const SIGN_IN_ATTEMPTS_PER_MINUTE = 5

const errorBody = z.object({ code: z.string() })

const linkProps = z.object({ verificationUrl: z.string() })

const resetProps = z.object({ resetPasswordUrl: z.string() })

const noticeProps = z.object({ maskedEmail: z.string(), name: z.string() })

const historyRows = z.array(z.object({ email: z.string(), replaced: z.number() }))

const subscriberRow = z.object({ email: z.string(), status: z.string(), token: z.string(), user_id: z.string().nullable() })

const addressesOf = (userId: string) =>
  historyRows
    .parse(
      sqlite.prepare("select email, replaced_at is not null as replaced from user_email_history where user_id = ? order by id").all(userId),
    )
    .map(({ email, replaced }) => ({ current: replaced === 0, email }))

const currentEmailOf = (userId: string): string =>
  z.object({ email: z.string() }).parse(sqlite.prepare("select email from user where id = ?").get(userId)).email

const ownerOfOrder = (orderId: string): string | null =>
  z.object({ user_id: z.string().nullable() }).parse(sqlite.prepare(`select user_id from "order" where id = ?`).get(orderId)).user_id

const subscribers = () =>
  z.array(subscriberRow).parse(sqlite.prepare("select email, status, token, user_id from newsletter_subscriber order by email").all())

const insertSubscriber = (email: string, status: string): void => {
  sqlite
    .prepare(
      `insert into newsletter_subscriber (id, email, locale, source, status, token, created_at, updated_at) values (?, ?, 'en-US', 'landing', ?, ?, 0, 0)`,
    )
    .run(`subscriber-${email}`, email, status, `token-${email}`)
}

const waitForEmail = (address: string, subject: string): Promise<SentEmail> =>
  vi.waitFor(() => {
    const email = stubs.sendEmail.mock.calls.map(([sent]) => sent).findLast((sent) => sent.to === address && sent.subject === subject)
    if (email === undefined) {
      throw new Error(`No "${subject}" email reached ${address}`)
    }

    return email
  })

const linkSentTo = async (address: string, subject: string): Promise<string> => {
  const { react } = await waitForEmail(address, subject)

  return linkProps.parse(react.props).verificationUrl
}

const signedIn = async (email: string, ip: string): Promise<Readonly<{ browser: AuthBrowser; userId: string }>> => {
  const userId = await createPasswordCustomer(email)
  const browser = openAuthBrowser(ip)
  await browser.signIn(email)

  return { browser, userId }
}

const askToChangeEmail = (browser: AuthBrowser, newEmail: string): Promise<Response> =>
  browser.post("/change-email", { newEmail, password: CUSTOMER_PASSWORD })

const sessionCountOf = (userId: string): number =>
  z.object({ sessions: z.number() }).parse(sqlite.prepare("select count(*) as sessions from session where user_id = ?").get(userId))
    .sessions

const sessionOn = async (browser: AuthBrowser): Promise<unknown> => {
  const response = await browser.follow(`${AUTH_BASE_URL}/get-session`)

  return response.json()
}

const signedInWithGoogleOnly = async (email: string, ip: string): Promise<Readonly<{ browser: AuthBrowser; userId: string }>> => {
  const account = await signedIn(email, ip)
  sqlite.prepare("delete from account where user_id = ? and provider_id = 'credential'").run(account.userId)

  return account
}

const changeEmail = async (browser: AuthBrowser, from: string, to: string): Promise<Response> => {
  await askToChangeEmail(browser, to)
  await browser.follow(await linkSentTo(from, changeEmailCopy.subject))

  return browser.follow(await linkSentTo(to, verifyEmailCopy.subject))
}

const linkIssuedAnHourAgo = async (from: string, to?: string): Promise<string> => {
  const { secret } = await auth.$context
  vi.useFakeTimers({ now: Date.now() - HOUR_MS + 60_000, toFake: ["Date"] })
  const token = await createEmailVerificationToken(
    secret,
    from,
    to,
    3600,
    to === undefined ? undefined : { requestType: "change-email-verification" },
  )
  vi.useRealTimers()

  return `${AUTH_BASE_URL}/verify-email?token=${token}`
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  stubs.sendEmail.mockResolvedValue(undefined)
  stubs.updateCustomer.mockResolvedValue({})
})

afterAll(() => {
  sqlite.close()
})

describe("a customer changing their sign-in address", () => {
  it("moves the account to the new address once both addresses confirm it, and keeps the old one in its history", async () => {
    const { browser, userId } = await signedIn("ola@marte.test", "198.51.100.1")

    const completed = await changeEmail(browser, "ola@marte.test", "ola@new.example")

    expect(completed.status).toBe(302)
    expect(currentEmailOf(userId)).toBe("ola@new.example")
    expect(addressesOf(userId)).toStrictEqual([
      { current: false, email: "ola@marte.test" },
      { current: true, email: "ola@new.example" },
    ])
  })

  it("records the change against the account with the old and new address", async () => {
    const { browser, userId } = await signedIn("piotr@marte.test", "198.51.100.2")

    await changeEmail(browser, "piotr@marte.test", "piotr@new.example")

    expect(authAudit.recordAuthEmailChangedAudit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ email: "piotr@new.example", id: userId }),
      {
        detail: "piotr@marte.test → piotr@new.example",
        ip: "198.51.100.2",
        metadata: { changed: ["email"], new: { email: "piotr@new.example" }, old: { email: "piotr@marte.test" } },
      },
    )
  })

  it("tells the old address where the account went, without spelling the new address out, and records that it did", async () => {
    const { browser, userId } = await signedIn("rafal@marte.test", "198.51.100.3")

    await changeEmail(browser, "rafal@marte.test", "rafal@new.example")

    const notice = await waitForEmail("rafal@marte.test", emailChangedCopy.subject)
    expect(noticeProps.parse(notice.react.props)).toStrictEqual({ maskedEmail: "r***@n***.example", name: "Ada" })
    await vi.waitFor(() => {
      expect(emailAudit.recordEmailSentAudit).toHaveBeenCalledWith("rafal@marte.test", {
        metadata: { emailKind: "email-changed" },
        resourceId: userId,
      })
    })
  })

  it("keeps the customer signed in, and lets them sign in with the new address only", async () => {
    const { browser } = await signedIn("sara@marte.test", "198.51.100.4")

    await changeEmail(browser, "sara@marte.test", "sara@new.example")

    const session = await browser.follow(`${AUTH_BASE_URL}/get-session`)
    await expect(session.json()).resolves.toMatchObject({ user: { email: "sara@new.example" } })
    await expect(openAuthBrowser("198.51.100.5").signIn("sara@marte.test")).resolves.toHaveProperty("status", 401)
    await expect(openAuthBrowser("198.51.100.6").signIn("sara@new.example")).resolves.toHaveProperty("status", 200)
  })

  it("moves the Stripe customer to the new address", async () => {
    const { browser, userId } = await signedIn("tomasz@marte.test", "198.51.100.7")
    sqlite.prepare("update user set stripe_customer_id = 'cus_tomasz' where id = ?").run(userId)

    await changeEmail(browser, "tomasz@marte.test", "tomasz@new.example")

    expect(stubs.updateCustomer).toHaveBeenCalledExactlyOnceWith("cus_tomasz", { email: "tomasz@new.example" })
    expect(customerAudit.recordCustomerStripeEmailFailedAudit).not.toHaveBeenCalled()
  })

  it("still completes the change when Stripe refuses, and records that the next checkout has to set the address", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    stubs.updateCustomer.mockRejectedValue(new Error("Stripe is down"))
    const { browser, userId } = await signedIn("urszula@marte.test", "198.51.100.8")
    sqlite.prepare("update user set stripe_customer_id = 'cus_urszula' where id = ?").run(userId)

    await changeEmail(browser, "urszula@marte.test", "urszula@new.example")

    expect(currentEmailOf(userId)).toBe("urszula@new.example")
    expect(customerAudit.recordCustomerStripeEmailFailedAudit).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ email: "urszula@new.example", id: userId }),
      { detail: "Error: Stripe is down", ip: "198.51.100.8" },
    )
  })

  it("moves the newsletter subscription to the new address with a fresh unsubscribe token", async () => {
    insertSubscriber("wanda@marte.test", "confirmed")
    const { browser, userId } = await signedIn("wanda@marte.test", "198.51.100.9")

    await changeEmail(browser, "wanda@marte.test", "wanda@new.example")

    const moved = subscribers().find(({ email }) => email.startsWith("wanda@"))
    expect(moved).toMatchObject({ email: "wanda@new.example", status: "confirmed", user_id: userId })
    expect(moved?.token).not.toBe("token-wanda@marte.test")
  })

  it("completes the change when the newsletter subscription cannot be moved, and logs why", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(newsletter.followAccountAddressChange).mockRejectedValueOnce(new Error("D1 is busy"))
    const { browser, userId } = await signedIn("weronika@marte.test", "198.51.100.24")

    await changeEmail(browser, "weronika@marte.test", "weronika@new.example")

    expect(currentEmailOf(userId)).toBe("weronika@new.example")
    expect(consoleError).toHaveBeenCalledWith("[Email change] Moving the newsletter subscription failed:", new Error("D1 is busy"))
  })

  it("links to the account the guest orders placed with the old address while the account held it", async () => {
    const freedAddress = "zofia@marte.test"
    const { browser, userId } = await signedIn(freedAddress, "198.51.100.10")
    sqlite
      .prepare(`insert into "order" (id, email, order_number, created_at, updated_at) values ('zofia-guest', ?, 'MRT-Z', ?, ?)`)
      .run(freedAddress, Date.now(), Date.now())

    await changeEmail(browser, freedAddress, "zofia@new.example")
    await createPasswordCustomer(freedAddress)

    expect(ownerOfOrder("zofia-guest")).toBe(userId)
  })

  it("ends a password reset link that was sent to the old address", async () => {
    const { browser, userId } = await signedIn("adam@marte.test", "198.51.100.11")
    await openAuthBrowser("198.51.100.12").post("/request-password-reset", {
      email: "adam@marte.test",
      redirectTo: "/en-US/auth/reset-password",
    })
    const { react: resetEmail } = await waitForEmail("adam@marte.test", resetPasswordCopy.subject)
    const resetUrl = resetProps.parse(resetEmail.props).resetPasswordUrl

    await changeEmail(browser, "adam@marte.test", "adam@new.example")

    const reset = await openAuthBrowser("198.51.100.12").post("/reset-password", {
      newPassword: `${CUSTOMER_PASSWORD}-taken`,
      token: new URL(resetUrl).pathname.split("/").at(-1),
    })
    expect(reset.status).toBe(400)
    expect(currentEmailOf(userId)).toBe("adam@new.example")
  })

  it("sends nothing and changes nothing when another account already has the address", async () => {
    await createPasswordCustomer("taken@marte.test")
    const { browser, userId } = await signedIn("bogna@marte.test", "198.51.100.13")

    const response = await askToChangeEmail(browser, "taken@marte.test")

    expect(response.status).toBe(200)
    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(currentEmailOf(userId)).toBe("bogna@marte.test")
  })
})

describe("the devices of an account whose address changed", () => {
  it("signs out every other device of the account and keeps the one that finished the change", async () => {
    const { browser, userId } = await signedIn("natalia@marte.test", "198.51.100.32")
    const otherDevice = openAuthBrowser("198.51.100.33")
    await otherDevice.signIn("natalia@marte.test")
    const before = sessionCountOf(userId)

    await changeEmail(browser, "natalia@marte.test", "natalia@new.example")

    expect(before).toBe(2)
    await expect(sessionOn(browser)).resolves.toMatchObject({ user: { email: "natalia@new.example" } })
    await expect(sessionOn(otherDevice)).resolves.toBeNull()
    expect(sessionCountOf(userId)).toBe(1)
  })

  it("keeps the device the last link was opened on even when it was not signed in, and signs out the one that asked", async () => {
    const { browser, userId } = await signedIn("olga@marte.test", "198.51.100.34")
    await askToChangeEmail(browser, "olga@new.example")
    await browser.follow(await linkSentTo("olga@marte.test", changeEmailCopy.subject))
    const phone = openAuthBrowser("198.51.100.35")

    await phone.follow(await linkSentTo("olga@new.example", verifyEmailCopy.subject))

    await expect(sessionOn(phone)).resolves.toMatchObject({ user: { email: "olga@new.example" } })
    await expect(sessionOn(browser)).resolves.toBeNull()
    expect(sessionCountOf(userId)).toBe(1)
  })
})

describe("asking to change the sign-in address", () => {
  it("refuses without the current password, and sends nothing", async () => {
    const { browser, userId } = await signedIn("halina@marte.test", "198.51.100.25")

    const response = await browser.post("/change-email", { newEmail: "halina@new.example" })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_PASSWORD" })
    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(currentEmailOf(userId)).toBe("halina@marte.test")
  })

  it("answers a wrong password the same way whether or not another account has the new address", async () => {
    const takenAddress = "ignacy-taken@marte.test"
    await createPasswordCustomer(takenAddress)
    const { browser } = await signedIn("ignacy@marte.test", "198.51.100.26")

    const answers = await Promise.all(
      ["ignacy@new.example", takenAddress].map(async (newEmail) => {
        const response = await browser.post("/change-email", { newEmail, password: `${CUSTOMER_PASSWORD}-wrong` })

        return { body: errorBody.parse(await response.json()), status: response.status }
      }),
    )

    expect(answers).toStrictEqual([
      { body: { code: "INVALID_PASSWORD" }, status: 400 },
      { body: { code: "INVALID_PASSWORD" }, status: 400 },
    ])
    expect(stubs.sendEmail).not.toHaveBeenCalled()
  })

  it("sends the confirmation to the current address once the password is right", async () => {
    const { browser } = await signedIn("jadwiga@marte.test", "198.51.100.27")

    const response = await askToChangeEmail(browser, "jadwiga@new.example")

    expect(response.status).toBe(200)
    await waitForEmail("jadwiga@marte.test", changeEmailCopy.subject)
  })

  it("counts every attempt against the same limit as signing in, so guessing stops after five a minute", async () => {
    const { browser } = await signedIn("kamil@marte.test", "198.51.100.28")
    const guesses: number[] = []
    for (let attempt = 0; attempt < SIGN_IN_ATTEMPTS_PER_MINUTE; attempt += 1) {
      const guess = await browser.post("/change-email", {
        newEmail: "kamil@new.example",
        password: `${CUSTOMER_PASSWORD}-${String(attempt)}`,
      })
      guesses.push(guess.status)
    }

    const response = await askToChangeEmail(browser, "kamil@new.example")

    expect(guesses).toStrictEqual([400, 400, 400, 400, 400])
    expect(response.status).toBe(429)
    expect(stubs.sendEmail).not.toHaveBeenCalled()
  })

  it("leaves a visitor who is not signed in to Better Auth's own refusal", async () => {
    const response = await openAuthBrowser("198.51.100.29").post("/change-email", { newEmail: "nobody@new.example" })

    expect(response.status).toBe(401)
  })
})

describe("asking to change the address of an account without a password", () => {
  it("needs no password from a session started in the last ten minutes", async () => {
    const { browser } = await signedInWithGoogleOnly("lena@marte.test", "198.51.100.30")

    const response = await browser.post("/change-email", { newEmail: "lena@new.example" })

    expect(response.status).toBe(200)
    await waitForEmail("lena@marte.test", changeEmailCopy.subject)
  })

  it("asks to sign in again once the session is older than ten minutes", async () => {
    const { browser, userId } = await signedInWithGoogleOnly("marek@marte.test", "198.51.100.31")
    sqlite.prepare("update session set created_at = ? where user_id = ?").run(Date.now() - ELEVEN_MINUTES_MS, userId)

    const response = await browser.post("/change-email", { newEmail: "marek@new.example" })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ code: "SESSION_NOT_FRESH" })
    expect(stubs.sendEmail).not.toHaveBeenCalled()
  })
})

describe("a link to confirm an address", () => {
  it("is refused once another account has taken the new address in the meantime", async () => {
    const { browser, userId } = await signedIn("cezary@marte.test", "198.51.100.14")
    await askToChangeEmail(browser, "cezary@new.example")
    await browser.follow(await linkSentTo("cezary@marte.test", changeEmailCopy.subject))
    const verification = await linkSentTo("cezary@new.example", verifyEmailCopy.subject)
    await createPasswordCustomer("cezary@new.example")

    const response = await browser.follow(verification)

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe("/en-US/account/overview?verified=true&error=USER_ALREADY_EXISTS")
    expect(currentEmailOf(userId)).toBe("cezary@marte.test")
  })

  it("is refused when it was sent before the account last took its address, as after changing back", async () => {
    const { browser, userId } = await signedIn("daria@marte.test", "198.51.100.15")
    const pending = await linkIssuedAnHourAgo("daria@marte.test", "daria@third.example")
    await changeEmail(browser, "daria@marte.test", "daria@new.example")
    await changeEmail(browser, "daria@new.example", "daria@marte.test")

    const response = await openAuthBrowser("198.51.100.16").follow(pending)

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_TOKEN" })
    expect(currentEmailOf(userId)).toBe("daria@marte.test")
  })

  it("never moves the account that took over a freed address, nor signs anyone in to it", async () => {
    const freedAddress = "edyta@marte.test"
    const { browser } = await signedIn(freedAddress, "198.51.100.17")
    const pending = await linkIssuedAnHourAgo(freedAddress, "edyta@third.example")
    const signUpLink = await linkIssuedAnHourAgo(freedAddress)
    await changeEmail(browser, freedAddress, "edyta@new.example")
    const nextHolder = await createPasswordCustomer(freedAddress)
    sqlite.prepare("update user set email_verified = 0 where id = ?").run(nextHolder)

    const changed = await openAuthBrowser("198.51.100.18").follow(`${pending}&callbackURL=${encodeURIComponent("/en-US")}`)
    const verified = await openAuthBrowser("198.51.100.19").follow(signUpLink)

    expect(changed.headers.get("location")).toBe("/en-US?error=INVALID_TOKEN")
    expect(errorBody.parse(await verified.json()).code).toBe("INVALID_TOKEN")
    expect(verified.headers.getSetCookie()).toStrictEqual([])
    expect(currentEmailOf(nextHolder)).toBe("edyta@marte.test")
  })

  it("answers with an error instead of following a callback to another site", async () => {
    const address = "filip@marte.test"
    await createPasswordCustomer(address)
    const pending = await linkIssuedAnHourAgo(address, "filip@third.example")

    const response = await openAuthBrowser("198.51.100.21").follow(`${pending}&callbackURL=${encodeURIComponent("//evil.example/")}`)

    expect(response.status).toBe(401)
  })

  it("still confirms a new account's address", async () => {
    await openAuthBrowser("198.51.100.22").post("/sign-up/email", { email: "gosia@marte.test", name: "Gosia", password: CUSTOMER_PASSWORD })

    const response = await openAuthBrowser("198.51.100.22").follow(await linkSentTo("gosia@marte.test", verifyEmailCopy.subject))

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe("/en-US/account/overview?verified=true")
  })
})

describe("an admin", () => {
  it("cannot change another account's address or mark it verified through Better Auth's admin endpoint", async () => {
    const admin = await signedIn("admin-email@marte.test", "198.51.100.23")
    sqlite.prepare("update user set role = 'admin', two_factor_enabled = 1 where id = ?").run(admin.userId)
    const customerId = await createPasswordCustomer("customer-email@marte.test")

    const changed = await admin.browser.post("/admin/update-user", { data: { email: "hijack@marte.test" }, userId: customerId })
    const verified = await admin.browser.post("/admin/update-user", { data: { emailVerified: false }, userId: customerId })

    expect(changed.status).toBe(403)
    await expect(changed.json()).resolves.toMatchObject({ code: "EMAIL_CHANGED_BY_ITS_OWNER" })
    expect(verified.status).toBe(403)
    expect(currentEmailOf(customerId)).toBe("customer-email@marte.test")
  })
})
