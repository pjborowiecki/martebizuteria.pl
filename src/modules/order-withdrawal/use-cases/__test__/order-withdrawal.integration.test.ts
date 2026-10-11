import { type ReactElement } from "react"

import { QueryClient } from "@tanstack/react-query"
import { isNotFound } from "@tanstack/react-router"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration, applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_WITHDRAWAL_MUTATION_KEYS } from "~/src/modules/order-withdrawal/order-withdrawal.constants"
import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"
import {
  getCustomerOrderWithdrawal,
  getCustomerOrderWithdrawalQuery,
} from "~/src/modules/order-withdrawal/use-cases/get-customer-order-withdrawal"
import {
  withdrawFromCustomerOrder,
  withdrawFromCustomerOrderMutation,
} from "~/src/modules/order-withdrawal/use-cases/withdraw-from-customer-order"
import { withdrawFromGuestOrder, withdrawFromGuestOrderMutation } from "~/src/modules/order-withdrawal/use-cases/withdraw-from-guest-order"

const { background, effects, sqlite, worker } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    background: [] as Promise<unknown>[],
    effects: {
      emailFailedAudit: vi.fn(),
      emailOutcome: vi.fn(),
      invalidateAdminOrders: vi.fn(),
      locale: vi.fn<() => string>(),
      rateLimit: vi.fn<(limit: Readonly<{ key: string; limit: number; windowSeconds: number }>) => Promise<boolean>>(),
      requestSession: vi.fn<() => Promise<{ user: { id: string; name: string; role: string } } | null>>(),
      sendEmail: vi.fn<(options: Readonly<SentEmail>) => Promise<string | undefined>>(),
      verifyTurnstile: vi.fn<(check: Readonly<{ action: string; hostname: string; token: string }>) => Promise<void>>(),
    },
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
    worker: { env: { APP_ENV: "test", RESEND_EMAIL_FROM: "orders@marte.test" } },
  }
})

interface SentEmail {
  readonly react: ReactElement<{ readonly adminOrderUrl?: string; readonly statement: OrderWithdrawal["statement"] }>
  readonly subject: string
  readonly to: string
}

vi.mock("cloudflare:workers", () => worker)
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

  return { ...actual, getRequest: () => new Request(`${SHOP_ORIGIN}/_serverFn/withdraw`) }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: effects.requestSession }))
vi.mock("~/src/lib/rate-limit", () => ({ clientAddress: () => "203.0.113.7", withinRateLimit: effects.rateLimit }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: effects.locale }))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: effects.sendEmail }))
vi.mock("~/src/lib/background", () => ({
  scheduleBackgroundWork: (task: Promise<unknown>) => {
    background.push(task)
  },
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminOrdersInvalidation: effects.invalidateAdminOrders,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordEmailFailedAudit: effects.emailFailedAudit,
  recordOrderEmailOutcome: effects.emailOutcome,
}))
vi.mock("~/src/integrations/cloudflare-turnstile/turnstile.server", () => ({ verifyTurnstileToken: effects.verifyTurnstile }))

const SHOP_ORIGIN = "http://127.0.0.1:3000"

const ANNA_ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const BOB_ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234568"

const ANNA = { user: { id: "user-anna", name: "Anna Kowalska", role: "customer" } }

const SHOP_INBOX = worker.env.RESEND_EMAIL_FROM

const TURNSTILE_TOKEN = "turnstile-token-1"

const PUBLIC_EMAIL_KEY_PREFIX = "public-email:"

const DAY_MS = 86_400_000

const wholeOrder = { consumerName: "Anna Kowalska", orderItemIds: [], reason: "", scope: "order" as const }

const indexRowsSchema = z.array(z.object({ name: z.string() }))

const customerWithdrawal = (overrides: Partial<Parameters<typeof withdrawFromCustomerOrder>[0]["data"]> = {}) =>
  withdrawFromCustomerOrder({ data: { ...wholeOrder, orderId: ANNA_ORDER_ID, ...overrides } })

const guestWithdrawal = (overrides: Partial<Parameters<typeof withdrawFromGuestOrder>[0]["data"]> = {}) =>
  withdrawFromGuestOrder({
    data: {
      consumerName: "Anna Kowalska",
      email: "anna@example.com",
      items: "",
      orderNumber: "mrt-2026-00042",
      reason: "",
      scope: "order",
      turnstileToken: TURNSTILE_TOKEN,
      ...overrides,
    },
  })

const withdrawalRowSchema = z.object({
  consumer_name: z.string(),
  created_at: z.number(),
  email: z.string(),
  items: z.string().nullable(),
  order_id: z.string(),
  reason: z.string().nullable(),
  scope: z.string(),
})

const readWithdrawals = () =>
  z
    .array(withdrawalRowSchema)
    .parse(
      sqlite
        .prepare("select order_id, consumer_name, email, items, reason, scope, created_at from order_withdrawal order by created_at")
        .all(),
    )

const publicEmailLimits = () =>
  effects.rateLimit.mock.calls
    .map(([limit]) => limit)
    .filter(({ key }) => key.startsWith(PUBLIC_EMAIL_KEY_PREFIX))
    .map(({ key, limit, windowSeconds }) => ({ counter: key.split(":").slice(1, 3).join(":"), limit, windowSeconds }))

const sentEmails = (): SentEmail[] => effects.sendEmail.mock.calls.map(([email]) => email)

const sentTo = (recipient: string): SentEmail | undefined => sentEmails().find(({ to }) => to === recipient)

const updateAnnaOrder = (assignments: string): void => {
  sqlite.prepare(`update "order" set ${assignments} where id = ?`).run(ANNA_ORDER_ID)
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  effects.locale.mockReturnValue("en-US")
  effects.rateLimit.mockResolvedValue(true)
  effects.requestSession.mockResolvedValue(ANNA)
  effects.sendEmail.mockResolvedValue(undefined)
  effects.verifyTurnstile.mockResolvedValue(undefined)
  sqlite.exec(`
    delete from order_withdrawal;
    delete from order_item;
    delete from "order";
    insert into user (id, name, email, email_verified) values ('user-anna', 'Anna Kowalska', 'anna@example.com', 1), ('user-bob', 'Bob', 'bob@example.com', 1)
      on conflict do nothing;
    insert into "order" (id, email, order_number, status, fulfillment_status, user_id) values
      ('${ANNA_ORDER_ID}', 'Anna@Example.com', 'MRT-2026-00042', 'processing', 'shipped', 'user-anna'),
      ('${BOB_ORDER_ID}', 'bob@example.com', 'MRT-2026-00043', 'processing', 'not_fulfilled', 'user-bob');
    insert into order_item (id, order_id, quantity, subtotal, title, total, unit_price, variant_title, created_at) values
      ('item-lapis', '${ANNA_ORDER_ID}', 1, 39899, 'Naszyjnik Lapis', 39899, 39899, 'Złoto', 1),
      ('item-luna', '${ANNA_ORDER_ID}', 2, 37800, 'Kolczyki Luna', 37800, 18900, null, 2),
      ('item-bob', '${BOB_ORDER_ID}', 1, 10000, 'Pierścionek', 10000, 10000, null, 3);
  `)
})

afterEach(async () => {
  vi.useRealTimers()
  await Promise.all(background.splice(0))
})

afterAll(() => {
  sqlite.close()
})

describe("order_withdrawal migration", () => {
  it("creates the table with an index on the order, and keeps its statements when it runs again", async () => {
    await customerWithdrawal()

    applyMigration(sqlite, MIGRATION.ORDER_WITHDRAWALS)

    expect(readWithdrawals()).toHaveLength(1)
    const indexes = sqlite
      .prepare("select name from sqlite_master where type = 'index' and tbl_name = 'order_withdrawal' and sql is not null")
      .all()
    expect(indexRowsSchema.parse(indexes)).toStrictEqual([{ name: "order_withdrawal_orderId_idx" }])
  })

  it("deletes the statements of a deleted order", async () => {
    await customerWithdrawal()

    sqlite.exec(`pragma foreign_keys = on; delete from "order" where id = '${ANNA_ORDER_ID}'; pragma foreign_keys = off;`)

    expect(readWithdrawals()).toStrictEqual([])
  })
})

describe("withdrawing from an order in the account", () => {
  it("records the statement for the whole order with the time it arrived", async () => {
    const before = Date.now()

    const result = await customerWithdrawal({ reason: "  " })

    expect(result).toMatchObject({ outcome: "recorded", receipt: { acknowledged: true, email: "Anna@Example.com" } })
    expect(readWithdrawals()).toStrictEqual([
      expect.objectContaining({
        consumer_name: "Anna Kowalska",
        email: "Anna@Example.com",
        items: null,
        order_id: ANNA_ORDER_ID,
        reason: null,
        scope: "order",
      }),
    ])
    expect(readWithdrawals()[0]?.created_at).toBeGreaterThanOrEqual(before)
    expect(effects.invalidateAdminOrders).toHaveBeenCalledOnce()
  })

  it("acknowledges the statement to the order's address in the customer's language and tells the shop", async () => {
    await customerWithdrawal({ reason: "Za duży" })

    await Promise.all(background)

    const acknowledgement = sentTo("Anna@Example.com")
    const notice = sentTo(SHOP_INBOX)
    expect(acknowledgement?.subject).toBe("We have received your withdrawal from order MRT-2026-00042 — M'Arte")
    expect(notice?.subject).toBe("Odstąpienie od umowy — zamówienie MRT-2026-00042 — M'Arte")
    expect(acknowledgement?.react.props.statement).toMatchObject({ consumerName: "Anna Kowalska", reason: "Za duży", scope: "order" })
    expect(notice?.react.props.adminOrderUrl).toBe(`${SHOP_ORIGIN}/admin/orders/${ANNA_ORDER_ID}`)
    expect(effects.emailOutcome).toHaveBeenCalledWith({
      failure: undefined,
      label: "Withdrawal acknowledgement → Anna@Example.com",
      orderId: ANNA_ORDER_ID,
    })
  })

  it("names the chosen products, leaving out lines of another order", async () => {
    await customerWithdrawal({ orderItemIds: ["item-luna", "item-lapis", "item-bob"], scope: "items" })

    expect(readWithdrawals()[0]).toMatchObject({ items: "Naszyjnik Lapis — Złoto × 1\nKolczyki Luna × 2", scope: "items" })
  })

  it("refuses a partial statement that names none of the order's products", async () => {
    await expect(customerWithdrawal({ orderItemIds: ["item-bob"], scope: "items" })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    expect(readWithdrawals()).toStrictEqual([])
  })

  it("does not find another customer's order", async () => {
    await expect(customerWithdrawal({ orderId: BOB_ORDER_ID })).resolves.toStrictEqual({ outcome: "notFound" })
    expect(readWithdrawals()).toStrictEqual([])
    expect(effects.sendEmail).not.toHaveBeenCalled()
  })

  it("refuses a visitor who is not signed in", async () => {
    effects.requestSession.mockResolvedValue(null)

    await expect(customerWithdrawal()).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })

  it("refuses a client that sends too many statements", async () => {
    effects.rateLimit.mockResolvedValue(false)

    await expect(customerWithdrawal()).rejects.toMatchObject({ code: ERROR_CODES.TOO_MANY_REQUESTS })
    expect(readWithdrawals()).toStrictEqual([])
  })

  it.each([
    ["delivered a month ago", `delivered_at = ${String(Date.now() - 30 * DAY_MS)}, status = 'completed'`],
    ["cancelled", "status = 'cancelled'"],
    ["refunded", "status = 'refunded'"],
  ])("tells the customer the period is over for an order %s", async (_state, assignments) => {
    updateAnnaOrder(assignments)

    await expect(customerWithdrawal()).resolves.toStrictEqual({ outcome: "closed" })
    expect(readWithdrawals()).toStrictEqual([])
  })

  it("accepts statements until the end of the Monday after a fourteenth day that falls on a Saturday", async () => {
    updateAnnaOrder(`delivered_at = ${String(Date.parse("2026-10-03T08:00:00.000Z"))}, status = 'completed'`)
    vi.useFakeTimers({ now: new Date("2026-10-19T21:59:59.000Z"), toFake: ["Date"] })

    await expect(customerWithdrawal({ orderItemIds: ["item-luna"], scope: "items" })).resolves.toMatchObject({ outcome: "recorded" })

    vi.setSystemTime(new Date("2026-10-19T22:00:00.000Z"))

    await expect(customerWithdrawal({ orderItemIds: ["item-lapis"], scope: "items" })).resolves.toStrictEqual({ outcome: "closed" })
  })

  it("accepts further statements for other products but not a second one for the whole order", async () => {
    await customerWithdrawal({ orderItemIds: ["item-luna"], scope: "items" })
    await customerWithdrawal()

    await expect(customerWithdrawal({ orderItemIds: ["item-lapis"], scope: "items" })).resolves.toStrictEqual({
      outcome: "alreadyWithdrawn",
    })
    expect(readWithdrawals().map(({ scope }) => scope)).toStrictEqual(["items", "order"])
  })

  it("keeps the statement and says so when the acknowledgement could not be sent", async () => {
    effects.sendEmail.mockImplementation(({ to }) => Promise.resolve(to === SHOP_INBOX ? undefined : "Resend is down"))
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(customerWithdrawal()).resolves.toMatchObject({ outcome: "recorded", receipt: { acknowledged: false } })
    expect(readWithdrawals()).toHaveLength(1)
  })

  it("sends the statement through its mutation", async () => {
    const { mutationFn } = withdrawFromCustomerOrderMutation
    const context = { client: new QueryClient(), meta: undefined }

    await expect(mutationFn?.({ ...wholeOrder, orderId: ANNA_ORDER_ID }, context)).resolves.toMatchObject({ outcome: "recorded" })
    expect(withdrawFromCustomerOrderMutation.mutationKey).toStrictEqual(ORDER_WITHDRAWAL_MUTATION_KEYS.WITHDRAW_FROM_CUSTOMER_ORDER)
  })
})

describe("withdrawing from an order as a guest", () => {
  it("checks the bot-check token for the withdrawal action on the shop's host before it looks for the order", async () => {
    effects.verifyTurnstile.mockRejectedValue(new AppError(ERROR_CODES.FORBIDDEN, "BOT_CHECK_FAILED"))

    await expect(guestWithdrawal()).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN, message: "BOT_CHECK_FAILED" })
    expect(effects.verifyTurnstile).toHaveBeenCalledExactlyOnceWith({
      action: "withdrawal",
      hostname: "127.0.0.1",
      remoteIp: undefined,
      token: TURNSTILE_TOKEN,
    })
    expect(readWithdrawals()).toStrictEqual([])
    expect(effects.sendEmail).not.toHaveBeenCalled()
  })

  it("finds the order by its number and email in any letter case, records the named products and acknowledges them", async () => {
    effects.requestSession.mockResolvedValue(null)
    effects.locale.mockReturnValue("pl-PL")

    await expect(guestWithdrawal({ email: "ANNA@example.com", items: "Kolczyki Luna × 1", scope: "items" })).resolves.toBeUndefined()
    expect(readWithdrawals()).toStrictEqual([
      expect.objectContaining({ items: "Kolczyki Luna × 1", order_id: ANNA_ORDER_ID, scope: "items" }),
    ])
    await Promise.all(background)
    expect(sentTo("Anna@Example.com")?.subject).toBe("Otrzymaliśmy Twoje odstąpienie od umowy dla zamówienia MRT-2026-00042 — M'Arte")
    expect(sentTo(SHOP_INBOX)).toBeDefined()
    expect(publicEmailLimits()).toStrictEqual([
      { counter: "test:withdrawal", limit: 3, windowSeconds: 3600 },
      { counter: "test:daily", limit: 50, windowSeconds: 86_400 },
    ])
  })

  it("drops a product list typed before the guest chose the whole order", async () => {
    await guestWithdrawal({ items: "Kolczyki Luna × 1" })

    expect(readWithdrawals()[0]).toMatchObject({ items: null, scope: "order" })
  })

  it.each([
    ["an email that does not match the order", { email: "bob@example.com" }, ""],
    ["an order number nobody has", { orderNumber: "MRT-2026-99999" }, ""],
    ["a cancelled order", {}, "status = 'cancelled'"],
    ["an order delivered a month ago", {}, `delivered_at = ${String(Date.now() - 30 * DAY_MS)}, status = 'completed'`],
  ])("answers %s exactly as a recorded statement, and records and sends nothing", async (_case, overrides, assignments) => {
    if (assignments !== "") {
      updateAnnaOrder(assignments)
    }

    await expect(guestWithdrawal(overrides)).resolves.toBeUndefined()
    await Promise.all(background)
    expect(readWithdrawals()).toStrictEqual([])
    expect(effects.sendEmail).not.toHaveBeenCalled()
    expect(publicEmailLimits()).toStrictEqual([])
  })

  it("answers a second statement for a withdrawn order the same way and sends nothing more", async () => {
    await guestWithdrawal()
    await Promise.all(background)
    effects.sendEmail.mockClear()

    await expect(guestWithdrawal({ items: "Kolczyki Luna × 1", scope: "items" })).resolves.toBeUndefined()
    await Promise.all(background)
    expect(readWithdrawals().map(({ scope }) => scope)).toStrictEqual(["order"])
    expect(effects.sendEmail).not.toHaveBeenCalled()
  })

  it("keeps the statement but sends neither e-mail once the visitor e-mail limits are used up", async () => {
    effects.rateLimit.mockImplementation(({ key }) => Promise.resolve(!key.startsWith(PUBLIC_EMAIL_KEY_PREFIX)))
    vi.spyOn(console, "warn").mockImplementation(() => {})

    await expect(guestWithdrawal()).resolves.toBeUndefined()
    await Promise.all(background)
    expect(readWithdrawals()).toHaveLength(1)
    expect(effects.sendEmail).not.toHaveBeenCalled()
  })

  it("refuses a client that sends too many statements", async () => {
    effects.rateLimit.mockResolvedValue(false)

    await expect(guestWithdrawal()).rejects.toMatchObject({ code: ERROR_CODES.TOO_MANY_REQUESTS })
    expect(effects.rateLimit).toHaveBeenCalledExactlyOnceWith({ key: "withdraw-from-guest-order:203.0.113.7", limit: 3, windowSeconds: 60 })
    expect(effects.verifyTurnstile).not.toHaveBeenCalled()
  })

  it("asks for a bot-check token when it sends the statement through its mutation", async () => {
    const { mutationFn } = withdrawFromGuestOrderMutation
    const context = { client: new QueryClient(), meta: undefined }
    const statement = {
      consumerName: "Anna",
      email: "anna@example.com",
      items: "",
      orderNumber: "MRT-2026-00042",
      reason: "",
      requestTurnstileToken: () => Promise.resolve(TURNSTILE_TOKEN),
      scope: "order",
    } as const

    await expect(mutationFn?.(statement, context)).resolves.toBeUndefined()
    expect(effects.verifyTurnstile).toHaveBeenCalledWith(expect.objectContaining({ token: TURNSTILE_TOKEN }))
    expect(readWithdrawals()).toHaveLength(1)
    expect(withdrawFromGuestOrderMutation.mutationKey).toStrictEqual(ORDER_WITHDRAWAL_MUTATION_KEYS.WITHDRAW_FROM_GUEST_ORDER)
  })
})

describe("the withdrawal function on the account order page", () => {
  it("offers the function to the owner, with their name and the order's address for the acknowledgement", async () => {
    await expect(getCustomerOrderWithdrawal({ data: { orderId: ANNA_ORDER_ID } })).resolves.toStrictEqual({
      canWithdraw: true,
      consumerName: "Anna Kowalska",
      email: "Anna@Example.com",
      statements: [],
    })
  })

  it("lists the statements sent and closes the function once the whole order is withdrawn", async () => {
    await customerWithdrawal({ orderItemIds: ["item-luna"], reason: "Za małe", scope: "items" })
    await customerWithdrawal()

    const withdrawal = await new QueryClient().query(getCustomerOrderWithdrawalQuery(ANNA_ORDER_ID))

    expect(withdrawal.canWithdraw).toBe(false)
    expect(withdrawal.statements).toStrictEqual([
      expect.objectContaining({ items: "Kolczyki Luna × 2", reason: "Za małe", scope: "items" }),
      expect.objectContaining({ items: undefined, reason: undefined, scope: "order" }),
    ])
  })

  it("does not show another customer's order", async () => {
    await expect(getCustomerOrderWithdrawal({ data: { orderId: BOB_ORDER_ID } })).resolves.toBeUndefined()
    await expect(new QueryClient().query(getCustomerOrderWithdrawalQuery(BOB_ORDER_ID))).rejects.toSatisfy(isNotFound)
  })
})
