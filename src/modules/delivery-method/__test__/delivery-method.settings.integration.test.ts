import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import deliveryMethodSeed from "~/src/integrations/drizzle-orm/seeds/delivery-methods.sql?raw"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getOfferedDeliveryMethodByIdQuery } from "~/src/modules/delivery-method/delivery-method.accessors"
import { DELIVERY_METHOD_ERROR } from "~/src/modules/delivery-method/delivery-method.constants"
import { archiveDeliveryMethod, archiveDeliveryMethodMutation } from "~/src/modules/delivery-method/use-cases/archive-delivery-method"
import { createDeliveryMethod, createDeliveryMethodMutation } from "~/src/modules/delivery-method/use-cases/create-delivery-method"
import {
  listAdminDeliveryMethods,
  listAdminDeliveryMethodsQuery,
} from "~/src/modules/delivery-method/use-cases/list-admin-delivery-methods"
import { listDeliveryMethods } from "~/src/modules/delivery-method/use-cases/list-delivery-methods"
import { reorderDeliveryMethods, reorderDeliveryMethodsMutation } from "~/src/modules/delivery-method/use-cases/reorder-delivery-methods"
import { updateDeliveryMethod, updateDeliveryMethodMutation } from "~/src/modules/delivery-method/use-cases/update-delivery-method"

const { effects, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    effects: {
      archived: vi.fn<(name: string) => void>(),
      created: vi.fn<(name: string) => void>(),
      invalidate: vi.fn<() => void>(),
      reordered: vi.fn<() => void>(),
      requestSession: vi.fn<() => Promise<{ user: { role: string; twoFactorEnabled?: boolean } } | null>>(),
      restored: vi.fn<(name: string) => void>(),
      updated: vi.fn<(name: string, options?: { metadata?: Record<string, unknown> }) => void>(),
    },
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
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

  return { ...actual, getRequest: () => new Request("https://marte.test/en-US/admin/settings/delivery") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: effects.requestSession }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/lib/rate-limit", () => ({}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleDeliveryMethodsInvalidation: effects.invalidate,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordDeliveryMethodArchivedAudit: effects.archived,
  recordDeliveryMethodCreatedAudit: effects.created,
  recordDeliveryMethodRestoredAudit: effects.restored,
  recordDeliveryMethodUpdatedAudit: effects.updated,
  recordDeliveryMethodsReorderedAudit: effects.reordered,
}))

const INPOST_ID = "019f4a10-0000-7000-8000-000000000001"

const METHOD = {
  COURIER: "019f4a10-0001-7000-8000-000000000002",
  IN_STORE: "019f4a10-0001-7000-8000-000000000003",
  LOCKER: "019f4a10-0001-7000-8000-000000000001",
} as const

const NAMES = { "en-US": "InPost express courier", "pl-PL": "Kurier InPost ekspres" }

const methodRowsSchema = z.array(
  z.object({
    archived_at: z.number().nullable(),
    id: z.string(),
    is_active: z.number(),
    name: z.string(),
    price: z.number(),
    rank: z.number(),
  }),
)

const readMethod = (id: string) =>
  methodRowsSchema.parse(
    sqlite.prepare("select id, name, price, rank, is_active, archived_at from delivery_method where id = ?").all(id),
  )[0]

const adminMethod = async (id: string) => {
  const { methods } = await listAdminDeliveryMethods()
  const method = methods.find((candidate) => candidate.id === id)
  if (method === undefined) {
    throw new Error(`no delivery method ${id}`)
  }

  return method
}

const editInput = async (id: string, overrides: Partial<{ isActive: boolean; price: number }> = {}) => {
  const method = await adminMethod(id)

  return { expectedUpdatedAt: method.updatedAt, id, isActive: method.isActive, names: method.names, price: method.price, ...overrides }
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  effects.requestSession.mockResolvedValue({ user: { role: ROLES.ADMIN, twoFactorEnabled: true } })
  sqlite.exec("delete from delivery_method; delete from courier;")
  sqlite.exec(deliveryMethodSeed)
})

afterAll(() => {
  sqlite.close()
})

describe("the delivery settings for an admin", () => {
  it("lists every carrier and every method in the checkout's order", async () => {
    const { couriers, methods } = await listAdminDeliveryMethods()

    expect(couriers.map((courier) => courier.internalCode).toSorted()).toStrictEqual(["inpost", "marte-atelier"])
    expect(methods.map((method) => method.id)).toStrictEqual([METHOD.COURIER, METHOD.LOCKER, METHOD.IN_STORE])
    expect(methods[0]).toMatchObject({ archivedAt: undefined, isActive: true, names: { "en-US": "InPost courier" }, price: 1999 })
  })

  it("refuses a customer", async () => {
    effects.requestSession.mockResolvedValue({ user: { role: ROLES.CUSTOMER } })

    await expect(listAdminDeliveryMethods()).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })
})

describe("adding a delivery method", () => {
  it("adds a courier method with an existing carrier at the end of the checkout's list", async () => {
    const { id } = await createDeliveryMethod({
      data: { courier: { id: INPOST_ID }, isActive: true, names: NAMES, price: 2999, type: "courier" },
    })

    expect(readMethod(id)).toMatchObject({ archived_at: null, is_active: 1, name: "Kurier InPost ekspres", price: 2999, rank: 3 })
    await expect(listDeliveryMethods()).resolves.toContainEqual(expect.objectContaining({ id, name: "InPost express courier" }))
    expect(effects.created).toHaveBeenCalledWith("Kurier InPost ekspres")
    expect(effects.invalidate).toHaveBeenCalledOnce()
  })

  it("adds a new carrier with its own code, so it never counts as InPost", async () => {
    const { id } = await createDeliveryMethod({
      data: {
        courier: { name: "DPD" },
        isActive: true,
        names: { "en-US": "DPD courier", "pl-PL": "Kurier DPD" },
        price: 1899,
        type: "courier",
      },
    })

    const method = await adminMethod(id)

    expect(method.courier).toMatchObject({ isActive: true, name: "DPD" })
    expect(method.courier.internalCode).not.toBe("inpost")
  })

  it("refuses a parcel locker method with a carrier other than InPost", async () => {
    await expect(
      createDeliveryMethod({ data: { courier: { name: "DPD" }, isActive: false, names: NAMES, price: 999, type: "locker" } }),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION, message: DELIVERY_METHOD_ERROR.LOCKER_NEEDS_INPOST })
  })

  it("refuses a second offered parcel locker method, and adds it hidden", async () => {
    const locker = { courier: { id: INPOST_ID }, names: NAMES, price: 999, type: "locker" as const }

    await expect(createDeliveryMethod({ data: { ...locker, isActive: true } })).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: DELIVERY_METHOD_ERROR.TYPE_ALREADY_OFFERED,
    })
    const { id } = await createDeliveryMethod({ data: { ...locker, isActive: false } })

    expect(readMethod(id)).toMatchObject({ is_active: 0 })
  })

  it("refuses a carrier that does not exist", async () => {
    await expect(
      createDeliveryMethod({
        data: { courier: { id: "019f4a10-0000-7000-8000-00000000ffff" }, isActive: true, names: NAMES, price: 0, type: "courier" },
      }),
    ).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
  })
})

describe("changing a delivery method", () => {
  it("saves the names, the price and the availability, and records what changed", async () => {
    await updateDeliveryMethod({ data: { ...(await editInput(METHOD.COURIER, { price: 2199 })), names: NAMES } })

    expect(readMethod(METHOD.COURIER)).toMatchObject({ name: "Kurier InPost ekspres", price: 2199 })
    expect(effects.updated).toHaveBeenCalledWith("Kurier InPost ekspres", {
      metadata: {
        changed: ["nameEn", "namePl", "price"],
        new: { nameEn: "InPost express courier", namePl: "Kurier InPost ekspres", price: 2199 },
        old: { nameEn: "InPost courier", namePl: "Kurier InPost", price: 1999 },
      },
    })
  })

  it("records no change when nothing changed", async () => {
    await updateDeliveryMethod({ data: await editInput(METHOD.COURIER) })

    expect(effects.updated).toHaveBeenCalledWith("Kurier InPost", undefined)
  })

  it("refuses a change made on a method someone else changed in the meantime", async () => {
    const stale = await editInput(METHOD.COURIER)
    await updateDeliveryMethod({ data: { ...stale, price: 2099 } })

    await expect(updateDeliveryMethod({ data: { ...stale, price: 2199 } })).rejects.toMatchObject({ code: ERROR_CODES.CONFLICT })
    expect(readMethod(METHOD.COURIER)).toMatchObject({ price: 2099 })
  })

  it("keeps at least one method offered at checkout", async () => {
    await updateDeliveryMethod({ data: await editInput(METHOD.LOCKER, { isActive: false }) })
    await updateDeliveryMethod({ data: await editInput(METHOD.IN_STORE, { isActive: false }) })

    await expect(updateDeliveryMethod({ data: await editInput(METHOD.COURIER, { isActive: false }) })).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: DELIVERY_METHOD_ERROR.LAST_OFFERED,
    })
  })
})

describe("archiving and ordering delivery methods", () => {
  it("archives a method, hides it from the checkout and restores it hidden", async () => {
    await archiveDeliveryMethod({ data: { archived: true, id: METHOD.LOCKER } })

    expect(readMethod(METHOD.LOCKER)?.archived_at).toBeGreaterThan(0)
    expect(readMethod(METHOD.LOCKER)).toMatchObject({ is_active: 0 })
    await expect(getOfferedDeliveryMethodByIdQuery(METHOD.LOCKER)).resolves.toBeUndefined()
    await expect(updateDeliveryMethod({ data: await editInput(METHOD.LOCKER) })).rejects.toMatchObject({
      message: DELIVERY_METHOD_ERROR.NOT_FOUND,
    })
    expect(effects.archived).toHaveBeenCalledWith("Paczkomat InPost")

    await archiveDeliveryMethod({ data: { archived: false, id: METHOD.LOCKER } })

    expect(readMethod(METHOD.LOCKER)).toMatchObject({ archived_at: null, is_active: 0 })
    expect(effects.restored).toHaveBeenCalledWith("Paczkomat InPost")
  })

  it("refuses to archive the last method offered at checkout", async () => {
    await archiveDeliveryMethod({ data: { archived: true, id: METHOD.LOCKER } })
    await archiveDeliveryMethod({ data: { archived: true, id: METHOD.IN_STORE } })

    await expect(archiveDeliveryMethod({ data: { archived: true, id: METHOD.COURIER } })).rejects.toMatchObject({
      message: DELIVERY_METHOD_ERROR.LAST_OFFERED,
    })
  })

  it("refuses a method that does not exist", async () => {
    await expect(archiveDeliveryMethod({ data: { archived: true, id: "019f4a10-0001-7000-8000-00000000ffff" } })).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
    })
  })

  it("puts the methods in the order the admin chose, which the checkout follows", async () => {
    await reorderDeliveryMethods({ data: [METHOD.IN_STORE, METHOD.LOCKER, METHOD.COURIER] })

    const offered = await listDeliveryMethods()

    expect(offered.map((method) => method.id)).toStrictEqual([METHOD.IN_STORE, METHOD.LOCKER, METHOD.COURIER])
    expect(effects.reordered).toHaveBeenCalledOnce()
  })
})

describe("the delivery settings through their query and mutation options", () => {
  it("reads, adds, changes, archives and orders methods", async () => {
    const { couriers } = await new QueryClient().query(listAdminDeliveryMethodsQuery())
    const { id } = await new MutationObserver(new QueryClient(), createDeliveryMethodMutation).mutate({
      courier: { id: INPOST_ID },
      isActive: false,
      names: NAMES,
      price: 2999,
      type: "courier",
    })
    await new MutationObserver(new QueryClient(), updateDeliveryMethodMutation).mutate(await editInput(id, { price: 3099 }))
    await new MutationObserver(new QueryClient(), reorderDeliveryMethodsMutation).mutate([id, METHOD.COURIER])
    await new MutationObserver(new QueryClient(), archiveDeliveryMethodMutation).mutate({ archived: true, id })

    expect(couriers).toHaveLength(2)
    expect(readMethod(id)).toMatchObject({ is_active: 0, price: 3099, rank: 0 })
  })

  it("puts the first method a shop adds at the top of the checkout's list", async () => {
    sqlite.exec("delete from delivery_method")

    const { id } = await createDeliveryMethod({
      data: { courier: { id: INPOST_ID }, isActive: true, names: NAMES, price: 0, type: "courier" },
    })

    expect(readMethod(id)).toMatchObject({ rank: 0 })
  })
})
