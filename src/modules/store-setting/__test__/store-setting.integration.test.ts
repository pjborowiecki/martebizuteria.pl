import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  changeSalesPaused,
  findFreeDeliveryThreshold,
  isSalesPaused,
  saveFreeDeliveryThreshold,
} from "~/src/modules/store-setting/store-setting.accessors"
import { STORE_SETTING_MUTATION_KEYS, STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"
import { getAdminFreeDeliveryQuery, getFreeDelivery, getFreeDeliveryQuery } from "~/src/modules/store-setting/use-cases/get-free-delivery"
import { getAdminSalesStatusQuery, getSalesStatus, getSalesStatusQuery } from "~/src/modules/store-setting/use-cases/get-sales-status"
import {
  setFreeDeliveryThreshold,
  setFreeDeliveryThresholdMutation,
} from "~/src/modules/store-setting/use-cases/set-free-delivery-threshold"
import { setSalesPaused, setSalesPausedMutation } from "~/src/modules/store-setting/use-cases/set-sales-paused"

const { effects, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    effects: {
      freeDeliveryInvalidate: vi.fn<() => void>(),
      invalidate: vi.fn<() => void>(),
      paused: vi.fn<(target: string) => void>(),
      requestSession: vi.fn<() => Promise<{ user: { role: string; twoFactorEnabled?: boolean } } | null>>(),
      resumed: vi.fn<(target: string) => void>(),
      settingsUpdated: vi.fn<(target: string, options?: unknown) => void>(),
    },
    sqlite: new DatabaseSync(":memory:"),
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

  return { ...actual, getRequest: () => new Request("https://marte.test/en-US/admin/overview") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: effects.requestSession }))
vi.mock("~/src/lib/rate-limit", () => ({}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleFreeDeliveryInvalidation: effects.freeDeliveryInvalidate,
  scheduleSalesStatusInvalidation: effects.invalidate,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordSalesPausedAudit: effects.paused,
  recordSalesResumedAudit: effects.resumed,
  recordSettingsUpdatedAudit: effects.settingsUpdated,
}))

const MIGRATED_AT = Date.UTC(2026, 9, 5, 12)

const storeSettingRowsSchema = z.array(z.object({ id: z.string(), sales_paused: z.number(), updated_at: z.number() }))

const readRow = () => storeSettingRowsSchema.parse(sqlite.prepare("select id, sales_paused, updated_at from store_setting").all())

beforeEach(() => {
  vi.clearAllMocks()
  effects.requestSession.mockResolvedValue({ user: { role: ROLES.ADMIN, twoFactorEnabled: true } })
  sqlite.exec("drop table if exists store_setting")
  applyMigration(sqlite, MIGRATION.STORE_SETTINGS)
  applyMigration(sqlite, MIGRATION.FREE_DELIVERY_THRESHOLD)
  applyMigration(sqlite, MIGRATION.SELLER_DETAILS)
  sqlite.exec(`update store_setting set created_at = ${String(MIGRATED_AT)}, updated_at = ${String(MIGRATED_AT)}`)
})

afterAll(() => {
  sqlite.close()
})

describe("store_setting migration", () => {
  it("opens the shop with a single settings row whose sales are not paused", () => {
    expect(readRow()).toStrictEqual([{ id: "store", sales_paused: 0, updated_at: MIGRATED_AT }])
  })

  it("keeps the existing row when the migration runs again", () => {
    sqlite.exec("update store_setting set sales_paused = 1")

    applyMigration(sqlite, MIGRATION.STORE_SETTINGS)

    expect(readRow()).toStrictEqual([{ id: "store", sales_paused: 1, updated_at: MIGRATED_AT }])
  })
})

describe("isSalesPaused", () => {
  it("reads the switch from the settings row", async () => {
    await expect(isSalesPaused()).resolves.toBe(false)

    sqlite.exec("update store_setting set sales_paused = 1")

    await expect(isSalesPaused()).resolves.toBe(true)
  })

  it("keeps sales open when the settings row is missing", async () => {
    sqlite.exec("delete from store_setting")

    await expect(isSalesPaused()).resolves.toBe(false)
  })
})

describe("changeSalesPaused", () => {
  it("reports a change and stamps the row when the switch moves", async () => {
    await expect(changeSalesPaused(true)).resolves.toBe(true)

    const [row] = readRow()
    expect(row).toMatchObject({ id: "store", sales_paused: 1 })
    expect(row?.updated_at).toBeGreaterThan(MIGRATED_AT)
  })

  it("reports no change and leaves the row alone when the switch is already there", async () => {
    await expect(changeSalesPaused(false)).resolves.toBe(false)

    expect(readRow()).toStrictEqual([{ id: "store", sales_paused: 0, updated_at: MIGRATED_AT }])
  })

  it("recreates a missing settings row instead of losing the pause", async () => {
    sqlite.exec("delete from store_setting")

    await expect(changeSalesPaused(true)).resolves.toBe(true)
    await expect(isSalesPaused()).resolves.toBe(true)
  })
})

describe("getSalesStatus", () => {
  it("tells anyone, signed in or not, whether sales are paused", async () => {
    effects.requestSession.mockResolvedValue(null)
    sqlite.exec("update store_setting set sales_paused = 1")

    await expect(getSalesStatus()).resolves.toStrictEqual({ salesPaused: true })
  })

  it("keys the storefront and admin reads apart so each realtime hub reaches its own", async () => {
    const queryClient = new QueryClient()

    expect(getSalesStatusQuery().queryKey).toStrictEqual(STORE_SETTING_QUERY_KEYS.SALES)
    expect(getAdminSalesStatusQuery().queryKey).toStrictEqual(STORE_SETTING_QUERY_KEYS.ADMIN.SALES)
    await expect(queryClient.query(getSalesStatusQuery())).resolves.toStrictEqual({ salesPaused: false })
    await expect(queryClient.query(getAdminSalesStatusQuery())).resolves.toStrictEqual({ salesPaused: false })
  })
})

describe("setSalesPaused", () => {
  it("pauses sales, refreshes every open tab and records the pause against the admin", async () => {
    await expect(setSalesPaused({ data: { salesPaused: true } })).resolves.toStrictEqual({ salesPaused: true })

    await expect(isSalesPaused()).resolves.toBe(true)
    expect(effects.invalidate).toHaveBeenCalledOnce()
    expect(effects.paused).toHaveBeenCalledExactlyOnceWith("store")
    expect(effects.resumed).not.toHaveBeenCalled()
  })

  it("resumes sales and records the resumption", async () => {
    sqlite.exec("update store_setting set sales_paused = 1")

    await expect(setSalesPaused({ data: { salesPaused: false } })).resolves.toStrictEqual({ salesPaused: false })

    await expect(isSalesPaused()).resolves.toBe(false)
    expect(effects.invalidate).toHaveBeenCalledOnce()
    expect(effects.resumed).toHaveBeenCalledExactlyOnceWith("store")
    expect(effects.paused).not.toHaveBeenCalled()
  })

  it("records nothing and refreshes nothing when a second admin asks for the state the shop is already in", async () => {
    sqlite.exec("update store_setting set sales_paused = 1")

    await expect(setSalesPaused({ data: { salesPaused: true } })).resolves.toStrictEqual({ salesPaused: true })

    expect(effects.invalidate).not.toHaveBeenCalled()
    expect(effects.paused).not.toHaveBeenCalled()
  })

  it("turns away a customer, who cannot manage the shop's settings", async () => {
    effects.requestSession.mockResolvedValue({ user: { role: ROLES.CUSTOMER } })

    await expect(setSalesPaused({ data: { salesPaused: true } })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    await expect(isSalesPaused()).resolves.toBe(false)
    expect(effects.paused).not.toHaveBeenCalled()
  })

  it("turns away a visitor who is not signed in", async () => {
    effects.requestSession.mockResolvedValue(null)

    await expect(setSalesPaused({ data: { salesPaused: true } })).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
    await expect(isSalesPaused()).resolves.toBe(false)
  })

  it("refuses a switch position that is not true or false", async () => {
    await expect(Reflect.apply(setSalesPaused, undefined, [{ data: { salesPaused: "yes" } }])).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
    })
    await expect(isSalesPaused()).resolves.toBe(false)
  })
})

describe("setSalesPausedMutation", () => {
  it("keys the mutation by the shared sales switch key", () => {
    expect(setSalesPausedMutation.mutationKey).toStrictEqual(STORE_SETTING_MUTATION_KEYS.SET_SALES_PAUSED)
  })

  it("moves the switch it is handed", async () => {
    await expect(new MutationObserver(new QueryClient(), setSalesPausedMutation).mutate({ salesPaused: true })).resolves.toStrictEqual({
      salesPaused: true,
    })
    await expect(isSalesPaused()).resolves.toBe(true)
  })
})

describe("free delivery threshold", () => {
  it("starts without a threshold, so every delivery is charged", async () => {
    await expect(findFreeDeliveryThreshold()).resolves.toBeUndefined()
  })

  it("saves a threshold, clears it again and recreates a missing settings row", async () => {
    await saveFreeDeliveryThreshold(30_000)

    await expect(findFreeDeliveryThreshold()).resolves.toBe(30_000)

    await saveFreeDeliveryThreshold(undefined)

    await expect(findFreeDeliveryThreshold()).resolves.toBeUndefined()

    sqlite.exec("delete from store_setting")
    await saveFreeDeliveryThreshold(25_000)

    await expect(findFreeDeliveryThreshold()).resolves.toBe(25_000)
    await expect(isSalesPaused()).resolves.toBe(false)
  })

  it("tells shoppers the threshold, keyed apart from the admin read", async () => {
    effects.requestSession.mockResolvedValue(null)
    sqlite.exec("update store_setting set free_delivery_threshold = 30000")
    const queryClient = new QueryClient()

    await expect(getFreeDelivery()).resolves.toStrictEqual({ threshold: 30_000 })
    expect(getFreeDeliveryQuery().queryKey).toStrictEqual(STORE_SETTING_QUERY_KEYS.FREE_DELIVERY)
    expect(getAdminFreeDeliveryQuery().queryKey).toStrictEqual(STORE_SETTING_QUERY_KEYS.ADMIN.FREE_DELIVERY)
    await expect(queryClient.query(getFreeDeliveryQuery())).resolves.toStrictEqual({ threshold: 30_000 })
    await expect(queryClient.query(getAdminFreeDeliveryQuery())).resolves.toStrictEqual({ threshold: 30_000 })
  })
})

describe("setFreeDeliveryThreshold", () => {
  it("sets the threshold, refreshes every open tab and records the old and new amounts", async () => {
    await expect(setFreeDeliveryThreshold({ data: { threshold: 30_000 } })).resolves.toStrictEqual({ threshold: 30_000 })

    await expect(findFreeDeliveryThreshold()).resolves.toBe(30_000)
    expect(effects.freeDeliveryInvalidate).toHaveBeenCalledOnce()
    expect(effects.settingsUpdated).toHaveBeenCalledExactlyOnceWith("free-delivery", {
      metadata: { changed: ["freeDeliveryThreshold"], new: { freeDeliveryThreshold: 30_000 }, old: { freeDeliveryThreshold: undefined } },
    })
  })

  it("turns free delivery off when no threshold is sent", async () => {
    sqlite.exec("update store_setting set free_delivery_threshold = 30000")

    await expect(setFreeDeliveryThreshold({ data: {} })).resolves.toStrictEqual({ threshold: undefined })

    await expect(findFreeDeliveryThreshold()).resolves.toBeUndefined()
    expect(effects.settingsUpdated).toHaveBeenCalledExactlyOnceWith("free-delivery", {
      metadata: { changed: ["freeDeliveryThreshold"], new: { freeDeliveryThreshold: undefined }, old: { freeDeliveryThreshold: 30_000 } },
    })
  })

  it("records nothing and refreshes nothing when the threshold is already set to that amount", async () => {
    sqlite.exec("update store_setting set free_delivery_threshold = 30000")

    await expect(setFreeDeliveryThreshold({ data: { threshold: 30_000 } })).resolves.toStrictEqual({ threshold: 30_000 })

    expect(effects.freeDeliveryInvalidate).not.toHaveBeenCalled()
    expect(effects.settingsUpdated).not.toHaveBeenCalled()
  })

  it("refuses a threshold that is not a positive whole amount or is too high", async () => {
    await expect(setFreeDeliveryThreshold({ data: { threshold: 0 } })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    await expect(setFreeDeliveryThreshold({ data: { threshold: 10.5 } })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    await expect(setFreeDeliveryThreshold({ data: { threshold: 10_000_001 } })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    await expect(findFreeDeliveryThreshold()).resolves.toBeUndefined()
  })

  it("turns away a customer, who cannot manage the shop's settings", async () => {
    effects.requestSession.mockResolvedValue({ user: { role: ROLES.CUSTOMER } })

    await expect(setFreeDeliveryThreshold({ data: { threshold: 30_000 } })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    await expect(findFreeDeliveryThreshold()).resolves.toBeUndefined()
  })

  it("keys the mutation and saves the threshold it is handed", async () => {
    expect(setFreeDeliveryThresholdMutation.mutationKey).toStrictEqual(STORE_SETTING_MUTATION_KEYS.SET_FREE_DELIVERY_THRESHOLD)
    await expect(
      new MutationObserver(new QueryClient(), setFreeDeliveryThresholdMutation).mutate({ threshold: 20_000 }),
    ).resolves.toStrictEqual({ threshold: 20_000 })
    await expect(findFreeDeliveryThreshold()).resolves.toBe(20_000)
  })
})
