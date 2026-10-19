import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import type * as DiscountAccessors from "~/src/modules/discount/discount.accessors"

const { sqlite, stubs } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
    stubs: {
      afterCodeCheck: vi.fn<() => Promise<void> | undefined>(),
      getRequestSession: vi.fn<() => Promise<{ user: { role: string; twoFactorEnabled?: boolean } } | null>>(),
    },
  }
})

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

  return { ...actual, getRequest: () => new Request("https://marte.test/admin/coupons") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: stubs.getRequestSession }))
vi.mock("~/src/lib/rate-limit", () => ({}))
vi.mock("~/src/modules/audit-log/use-cases/record-settings-audit.server", () => ({
  recordDiscountCreatedAudit: vi.fn(),
  recordDiscountUpdatedAudit: vi.fn(),
}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/modules/discount/discount.accessors", async (importOriginal) => {
  const actual = await importOriginal<typeof DiscountAccessors>()

  return {
    ...actual,
    getDiscountByCode: async (code: string) => {
      const found = await actual.getDiscountByCode(code)
      await stubs.afterCodeCheck()

      return found
    },
  }
})

const { ROLES } = await import("~/src/integrations/better-auth/auth.access")
const { applyMigrationHistory } = await import("~/src/platform/testing/mocks/migrations")
const { ERROR_CODES } = await import("~/src/modules/_core/constants/errors")
const { DISCOUNT_ERROR_CODES, DISCOUNT_TYPE } = await import("~/src/modules/discount/discount.constants")
const { createDiscount } = await import("~/src/modules/discount/use-cases/create-discount")
const { updateDiscount } = await import("~/src/modules/discount/use-cases/update-discount")

const OWN_DISCOUNT_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const FORM_VALUES = { code: "spring-24", isActive: true, type: DISCOUNT_TYPE.PERCENTAGE, value: 15 }

const CODE_TAKEN = { code: ERROR_CODES.CONFLICT, message: DISCOUNT_ERROR_CODES.CODE_TAKEN }

const readCodes = () =>
  z.array(z.object({ code: z.string(), id: z.string() })).parse(sqlite.prepare("select id, code from discount order by code, id").all())

const saveRivalCode = (code: string) => {
  sqlite.exec(`insert into discount (id, code, type, value) values ('discount-rival', '${code}', 'percentage', 10)`)

  return Promise.resolve()
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  stubs.getRequestSession.mockResolvedValue({ user: { role: ROLES.ADMIN, twoFactorEnabled: true } })
  sqlite.exec(`
    delete from discount;
    insert into discount (id, code, type, value) values ('${OWN_DISCOUNT_ID}', 'OWN-10', 'percentage', 10);
  `)
})

afterAll(() => {
  sqlite.close()
})

describe("creating a code another admin saves at the same moment", () => {
  it("refuses the code as taken when the other admin's code lands between the check and the insert", async () => {
    stubs.afterCodeCheck.mockImplementationOnce(() => saveRivalCode("SPRING-24"))

    await expect(createDiscount({ data: { values: FORM_VALUES } })).rejects.toMatchObject(CODE_TAKEN)
    expect(readCodes()).toStrictEqual([
      { code: "OWN-10", id: OWN_DISCOUNT_ID },
      { code: "SPRING-24", id: "discount-rival" },
    ])
  })

  it("saves the code for one of two admins creating it at once and tells the other it is taken", async () => {
    const bothChecked = Promise.withResolvers<undefined>()
    stubs.afterCodeCheck.mockImplementationOnce(() => bothChecked.promise)
    stubs.afterCodeCheck.mockImplementationOnce(() => {
      bothChecked.resolve(undefined)

      return bothChecked.promise
    })

    const outcomes = await Promise.allSettled([
      createDiscount({ data: { values: FORM_VALUES } }),
      createDiscount({ data: { values: FORM_VALUES } }),
    ])

    expect(outcomes.filter(({ status }) => status === "fulfilled")).toStrictEqual([
      { status: "fulfilled", value: { code: "SPRING-24", ok: true } },
    ])
    expect(outcomes.filter(({ status }) => status === "rejected")).toMatchObject([{ reason: CODE_TAKEN, status: "rejected" }])
    expect(readCodes().filter(({ code }) => code === "SPRING-24")).toHaveLength(1)
  })
})

describe("renaming a code onto one another admin saves at the same moment", () => {
  it("refuses the new code as taken and keeps the old one", async () => {
    stubs.afterCodeCheck.mockImplementationOnce(() => saveRivalCode("SUMMER-25"))

    await expect(updateDiscount({ data: { id: OWN_DISCOUNT_ID, values: { ...FORM_VALUES, code: "summer-25" } } })).rejects.toMatchObject(
      CODE_TAKEN,
    )
    expect(readCodes()).toStrictEqual([
      { code: "OWN-10", id: OWN_DISCOUNT_ID },
      { code: "SUMMER-25", id: "discount-rival" },
    ])
  })
})
