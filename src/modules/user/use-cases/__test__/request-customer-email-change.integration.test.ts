import { type ReactElement } from "react"

import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { verifyJWT } from "better-auth/crypto"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { AUTH_BASE_URL, createPasswordCustomer, openAuthBrowser } from "~/src/platform/testing/lib/auth-browser"
import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { requestCustomerEmailChange, requestCustomerEmailChangeMutation } from "~/src/modules/user/use-cases/request-customer-email-change"
import { CUSTOMER_EMAIL_CHANGE_ATTEMPTS, CUSTOMER_EMAIL_CHANGE_ERROR, USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"

import emailChangedCopy from "~/messages/en-US/emails.email-changed.json"
import supportEmailChangeCopy from "~/messages/en-US/emails.support-email-change.json"
import polishSupportEmailChangeCopy from "~/messages/pl-PL/emails.support-email-change.json"

interface SentEmail {
  readonly react: ReactElement<Record<string, unknown>>
  readonly subject: string
  readonly to: string
}

interface TestSession {
  readonly session: { readonly createdAt: Date; readonly id: string }
  readonly user: {
    readonly email: string
    readonly id: string
    readonly name: string
    readonly role: string
    readonly twoFactorEnabled: boolean
  }
}

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

const stubs = vi.hoisted(() => ({
  enqueueAudit: vi.fn<(message: Record<string, unknown>) => Promise<void>>(),
  requestSession: vi.fn<() => Promise<TestSession | null>>(),
  sendEmail: vi.fn<(email: SentEmail) => Promise<string | undefined>>(),
}))

vi.mock("cloudflare:workers", () => ({
  env: {
    AUDIT_LOG_QUEUE: { send: stubs.enqueueAudit },
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))
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

  return {
    ...actual,
    getRequest: () =>
      new Request("http://localhost:3000/en-US/admin/customers/customer", { headers: { "cf-connecting-ip": "203.0.113.9" } }),
  }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: stubs.requestSession }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: stubs.sendEmail }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { customers: { update: vi.fn() } } }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminAuditLogInvalidation: vi.fn(),
  scheduleAdminCustomersInvalidation: vi.fn(),
  scheduleAdminNewsletterSubscribersInvalidation: vi.fn(),
}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const ADMIN = { email: "obsluga@marte.test", id: "admin-support", name: "Obsługa M'Arte" } as const

const POSTAL_CODE = "31-042"

const linkProps = z.object({ verificationUrl: z.string() })

const tokenPayload = z.object({ email: z.string(), requestType: z.string(), updateTo: z.string() })

const auditMetadata = z.record(z.string(), z.unknown())

const auditMessage = z.object({
  action: z.string(),
  actorId: z.string().optional(),
  actorRole: z.string(),
  category: z.string(),
  ip: z.string().optional(),
  metadata: z
    .string()
    .transform((raw): unknown => JSON.parse(raw))
    .pipe(auditMetadata)
    .optional(),
  resourceId: z.string().optional(),
  severity: z.string(),
  target: z.string(),
})

let accountCount = 0

const nextAddress = (name: string): string => {
  accountCount += 1

  return `${name}-${String(accountCount)}@marte.test`
}

const signedInAs = ({ role = ROLES.ADMIN, twoFactorEnabled = true }: { role?: string; twoFactorEnabled?: boolean } = {}): void => {
  stubs.requestSession.mockResolvedValue({
    session: { createdAt: new Date(), id: "session-support" },
    user: { ...ADMIN, role, twoFactorEnabled },
  })
}

const placeOrder = (
  userId: string,
  { checkoutUserId = userId, locale = "en-US", orderNumber, postalCode = POSTAL_CODE }: PlacedOrder,
): void => {
  const id = `order-${orderNumber}`
  const now = Date.now()
  sqlite
    .prepare(
      `insert into checkout (id, email, status, user_id, created_at, updated_at) values (?, 'checkout@marte.test', 'completed', ?, ?, ?)`,
    )
    .run(`checkout-${orderNumber}`, checkoutUserId, now, now)
  sqlite
    .prepare(
      `insert into "order" (id, checkout_id, email, metadata, order_number, user_id, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, `checkout-${orderNumber}`, "checkout@marte.test", JSON.stringify({ locale }), orderNumber, userId, now, now)
  sqlite
    .prepare(
      `insert into order_address (id, address1, city, country_code, first_name, last_name, order_id, postal_code, type, created_at, updated_at)
        values (?, 'ul. Floriańska 3', 'Kraków', 'PL', 'Ada', 'Nowak', ?, ?, 'shipping', ?, ?)`,
    )
    .run(`address-${orderNumber}`, id, postalCode, now, now)
  sqlite
    .prepare(
      `insert into order_address (id, address1, city, country_code, first_name, last_name, order_id, postal_code, type, created_at, updated_at)
        values (?, 'ul. Firmowa 1', 'Gdańsk', 'PL', 'Ada', 'Nowak', ?, '80-001', 'billing', ?, ?)`,
    )
    .run(`billing-${orderNumber}`, id, now, now)
}

const customerWithOrder = async (name: string, order: Partial<PlacedOrder> = {}): Promise<Customer> => {
  const email = nextAddress(name)
  const id = await createPasswordCustomer(email)
  const orderNumber = order.orderNumber ?? `MRT-2026-${String(accountCount).padStart(5, "0")}`
  placeOrder(id, { ...order, orderNumber })

  return { email, id, orderNumber }
}

const requestChange = (customer: Customer, overrides: Partial<{ newEmail: string; orderNumber: string; postalCode: string }> = {}) =>
  requestCustomerEmailChange({
    data: {
      newEmail: `moved-${customer.email}`,
      orderNumber: customer.orderNumber,
      postalCode: POSTAL_CODE,
      userId: customer.id,
      ...overrides,
    },
  })

const currentEmailOf = (userId: string): string =>
  z.object({ email: z.string() }).parse(sqlite.prepare("select email from user where id = ?").get(userId)).email

const audits = (action: string) =>
  stubs.enqueueAudit.mock.calls.map(([message]) => auditMessage.parse(message)).filter((message) => message.action === action)

const emailChangeAudits = () => [
  ...audits(AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_REQUESTED),
  ...audits(AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_VERIFICATION_FAILED),
]

const emailsTo = (address: string): readonly SentEmail[] =>
  stubs.sendEmail.mock.calls.map(([sent]) => sent).filter((sent) => sent.to === address)

const linkSentTo = (address: string): string => {
  const [email] = emailsTo(address)
  if (email === undefined) {
    throw new Error(`No email reached ${address}`)
  }

  return linkProps.parse(email.react.props).verificationUrl
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  sqlite.exec("delete from rate_limit")
  stubs.enqueueAudit.mockResolvedValue(undefined)
  stubs.sendEmail.mockResolvedValue(undefined)
  signedInAs()
})

afterAll(() => {
  sqlite.close()
})

describe("requestCustomerEmailChange", () => {
  it("sends the new address a link that confirms the change, and leaves the account on its address until it is opened", async () => {
    const customer = await customerWithOrder("ola")
    const newEmail = `moved-${customer.email}`

    await expect(requestChange(customer)).resolves.toStrictEqual({ newEmail })

    const [email] = emailsTo(newEmail)
    expect(email?.subject).toBe(supportEmailChangeCopy.subject)
    expect(email?.react.props).toMatchObject({ locale: "en-US", messages: supportEmailChangeCopy, name: "Ada" })
    const link = new URL(linkSentTo(newEmail))
    expect(`${link.origin}${link.pathname}`).toBe(`${AUTH_BASE_URL}/verify-email`)
    expect(link.searchParams.get("callbackURL")).toBe("/en-US/account/profile")
    expect(currentEmailOf(customer.id)).toBe(customer.email)
  })

  it("signs the link the way Better Auth signs the second step of a customer's own change of address", async () => {
    const customer = await customerWithOrder("piotr")
    const newEmail = `moved-${customer.email}`

    await requestChange(customer)

    const { secret } = await auth.$context
    const token = new URL(linkSentTo(newEmail)).searchParams.get("token")
    const payload: unknown = await verifyJWT(String(token), secret)
    expect(tokenPayload.parse(payload)).toStrictEqual({
      email: customer.email,
      requestType: "change-email-verification",
      updateTo: newEmail,
    })
  })

  it("moves the account once the link is opened, signs the customer in and tells the old address", async () => {
    const customer = await customerWithOrder("rafal")
    const newEmail = `moved-${customer.email}`
    await requestChange(customer)
    const browser = openAuthBrowser("198.51.100.40")

    const opened = await browser.follow(linkSentTo(newEmail))

    expect(opened.status).toBe(302)
    expect(opened.headers.get("location")).toBe("/en-US/account/profile")
    expect(currentEmailOf(customer.id)).toBe(newEmail)
    const session = await browser.follow(`${AUTH_BASE_URL}/get-session`)
    await expect(session.json()).resolves.toMatchObject({ user: { email: newEmail } })
    await vi.waitFor(() => {
      expect(emailsTo(customer.email).map(({ subject }) => subject)).toContain(emailChangedCopy.subject)
    })
    expect(audits(AUDIT_LOG_ACTION.AUTH_EMAIL_CHANGED)).toMatchObject([{ resourceId: customer.id, target: newEmail }])
  })

  it("writes to the customer in the language of the order they named", async () => {
    const customer = await customerWithOrder("sara", { locale: "pl-PL" })
    const newEmail = `moved-${customer.email}`

    await requestChange(customer)

    const [email] = emailsTo(newEmail)
    expect(email?.subject).toBe(polishSupportEmailChangeCopy.subject)
    expect(email?.react.props).toMatchObject({ locale: "pl-PL", messages: polishSupportEmailChangeCopy })
    expect(new URL(linkSentTo(newEmail)).searchParams.get("callbackURL")).toBe("/account/profile")
  })

  it("accepts the order number and postal code however the customer spells them", async () => {
    const customer = await customerWithOrder("tomasz", { orderNumber: "MRT-2026-00777", postalCode: "31-042" })

    await expect(
      requestChange(customer, { newEmail: "Tomasz.New@Example.com", orderNumber: " mrt 2026 00777 ", postalCode: "31042" }),
    ).resolves.toStrictEqual({
      newEmail: "tomasz.new@example.com",
    })
  })

  it("records the request against the customer, credited to the admin, with the order number and never the postal code", async () => {
    const customer = await customerWithOrder("urszula")
    const newEmail = `moved-${customer.email}`

    await requestChange(customer)

    expect(audits(AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_REQUESTED)).toStrictEqual([
      {
        action: AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_REQUESTED,
        actorId: ADMIN.id,
        actorRole: "admin",
        category: "customers",
        ip: "203.0.113.9",
        metadata: { email: customer.email, newEmail, orderNumber: customer.orderNumber },
        resourceId: customer.id,
        severity: "warning",
        target: customer.email,
      },
    ])
    expect(JSON.stringify(stubs.enqueueAudit.mock.calls)).not.toContain(POSTAL_CODE)
  })

  it("is the mutation the change-email sheet runs", async () => {
    const customer = await customerWithOrder("wanda")
    const observer = new MutationObserver(new QueryClient(), requestCustomerEmailChangeMutation)

    await expect(
      observer.mutate({
        newEmail: `moved-${customer.email}`,
        orderNumber: customer.orderNumber,
        postalCode: POSTAL_CODE,
        userId: customer.id,
      }),
    ).resolves.toStrictEqual({
      newEmail: `moved-${customer.email}`,
    })
    expect(requestCustomerEmailChangeMutation.mutationKey).toStrictEqual(USER_MUTATION_KEYS.REQUEST_CUSTOMER_EMAIL_CHANGE)
  })
})

describe("requestCustomerEmailChange refusals", () => {
  it.each([
    { name: "a wrong postal code", overrides: { postalCode: "00-950" } },
    { name: "an order number of no order", overrides: { orderNumber: "MRT-2026-99999" } },
    { name: "the postal code of the order's billing address", overrides: { postalCode: "80-001" } },
  ])("sends nothing for $name and records the failed check without the postal code", async ({ overrides }) => {
    const customer = await customerWithOrder("adam")

    await expect(requestChange(customer, overrides)).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
      message: CUSTOMER_EMAIL_CHANGE_ERROR.NOT_VERIFIED,
    })

    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(audits(AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_VERIFICATION_FAILED)).toMatchObject([
      {
        actorId: ADMIN.id,
        metadata: { newEmail: `moved-${customer.email}`, orderNumber: overrides.orderNumber ?? customer.orderNumber, refusal: "mismatch" },
        resourceId: customer.id,
      },
    ])
    expect(JSON.stringify(stubs.enqueueAudit.mock.calls)).not.toContain(overrides.postalCode ?? POSTAL_CODE)
  })

  it("does not accept another account's order", async () => {
    const customer = await customerWithOrder("bogna")
    const other = await customerWithOrder("bogna-other")

    await expect(requestChange(customer, { orderNumber: other.orderNumber })).rejects.toMatchObject({
      message: CUSTOMER_EMAIL_CHANGE_ERROR.NOT_VERIFIED,
    })
  })

  it("does not accept an order placed without signing in, which anyone could place with the account's address", async () => {
    const customer = await customerWithOrder("cezary", { checkoutUserId: null })

    await expect(requestChange(customer)).rejects.toMatchObject({ message: CUSTOMER_EMAIL_CHANGE_ERROR.NOT_VERIFIED })
  })

  it("does not accept an order whose delivery address has no postal code", async () => {
    const customer = await customerWithOrder("daria", { postalCode: null })

    await expect(requestChange(customer)).rejects.toMatchObject({ message: CUSTOMER_EMAIL_CHANGE_ERROR.NOT_VERIFIED })
  })

  it(`stops checking an account after ${String(CUSTOMER_EMAIL_CHANGE_ATTEMPTS.MAX)} attempts in an hour, even with the right details`, async () => {
    const customer = await customerWithOrder("edyta")
    const other = await customerWithOrder("edyta-other")
    for (let attempt = 0; attempt < CUSTOMER_EMAIL_CHANGE_ATTEMPTS.MAX; attempt += 1) {
      await expect(requestChange(customer, { postalCode: "00-000" })).rejects.toMatchObject({
        message: CUSTOMER_EMAIL_CHANGE_ERROR.NOT_VERIFIED,
      })
    }

    await expect(requestChange(customer)).rejects.toMatchObject({
      code: ERROR_CODES.TOO_MANY_REQUESTS,
      message: CUSTOMER_EMAIL_CHANGE_ERROR.TOO_MANY_ATTEMPTS,
    })
    await expect(requestChange(other)).resolves.toStrictEqual({ newEmail: `moved-${other.email}` })
    expect(emailsTo(`moved-${customer.email}`)).toStrictEqual([])
    expect(audits(AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_VERIFICATION_FAILED).at(-1)).toMatchObject({
      metadata: { orderNumber: customer.orderNumber, refusal: "tooManyAttempts" },
      resourceId: customer.id,
    })
  })

  it("refuses an account that does not exist", async () => {
    await expect(
      requestCustomerEmailChange({
        data: { newEmail: "nobody@example.com", orderNumber: "MRT-2026-00001", postalCode: POSTAL_CODE, userId: "user-missing" },
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND, message: CUSTOMER_EMAIL_CHANGE_ERROR.NOT_FOUND })
  })

  it("refuses an account with admin access, whose address only its owner changes", async () => {
    const admin = await customerWithOrder("filip")
    sqlite.prepare("update user set role = 'admin' where id = ?").run(admin.id)

    await expect(requestChange(admin)).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
      message: CUSTOMER_EMAIL_CHANGE_ERROR.ADMIN_ACCOUNT,
    })
    expect(emailChangeAudits()).toStrictEqual([])
  })

  it("refuses the address the account already has, whatever its letter case", async () => {
    const customer = await customerWithOrder("gosia")

    await expect(requestChange(customer, { newEmail: customer.email.toUpperCase() })).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CUSTOMER_EMAIL_CHANGE_ERROR.UNCHANGED,
    })
  })

  it("refuses an address another account holds", async () => {
    const customer = await customerWithOrder("henryk")
    const holder = await customerWithOrder("henryk-holder")

    await expect(requestChange(customer, { newEmail: holder.email })).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: CUSTOMER_EMAIL_CHANGE_ERROR.ADDRESS_TAKEN,
    })
    expect(stubs.sendEmail).not.toHaveBeenCalled()
  })

  it("tells the admin when the email could not be sent, and records no request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    stubs.sendEmail.mockResolvedValue("Resend is down")
    const customer = await customerWithOrder("iga")

    await expect(requestChange(customer)).rejects.toMatchObject({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: CUSTOMER_EMAIL_CHANGE_ERROR.EMAIL_NOT_SENT,
    })
    expect(audits(AUDIT_LOG_ACTION.CUSTOMER_EMAIL_CHANGE_REQUESTED)).toStrictEqual([])
    expect(audits(AUDIT_LOG_ACTION.EMAIL_FAILED)).toMatchObject([{ resourceId: customer.id, target: `moved-${customer.email}` }])
  })

  it("refuses an address that is not an email address", async () => {
    const customer = await customerWithOrder("jan")

    await expect(requestChange(customer, { newEmail: "not-an-address" })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
  })
})

describe("requestCustomerEmailChange authorization", () => {
  it.each([
    { name: "a visitor who is not signed in", session: undefined },
    { name: "a customer", session: { role: ROLES.CUSTOMER, twoFactorEnabled: false } },
    { name: "an admin without two-factor authentication", session: { role: ROLES.ADMIN, twoFactorEnabled: false } },
  ])("is closed to $name", async ({ session }) => {
    if (session === undefined) {
      stubs.requestSession.mockResolvedValue(null)
    } else {
      signedInAs(session)
    }
    const customer = await customerWithOrder("karol")

    await expect(requestChange(customer)).rejects.toMatchObject({
      code: session === undefined ? ERROR_CODES.UNAUTHORIZED : ERROR_CODES.FORBIDDEN,
    })
    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(emailChangeAudits()).toStrictEqual([])
  })
})

interface Customer {
  readonly email: string
  readonly id: string
  readonly orderNumber: string
}

interface PlacedOrder {
  readonly checkoutUserId?: string | null
  readonly locale?: string
  readonly orderNumber: string
  readonly postalCode?: string | null
}
