import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { afterAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { MIGRATION, applyMigration } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { changeSalesPaused, readSellerDetails, saveSellerDetailsIfUnchanged } from "~/src/modules/store-setting/store-setting.accessors"
import { STORE_SETTING_MUTATION_KEYS, STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"
import {
  getAdminSellerDetailsQuery,
  getSellerDetails,
  getSellerDetailsQuery,
} from "~/src/modules/store-setting/use-cases/get-seller-details"
import { updateSellerDetails, updateSellerDetailsMutation } from "~/src/modules/store-setting/use-cases/update-seller-details"

const { effects, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    effects: {
      invalidate: vi.fn<() => void>(),
      requestSession: vi.fn<() => Promise<{ user: { role: string; twoFactorEnabled?: boolean } } | null>>(),
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

  return { ...actual, getRequest: () => new Request("https://marte.test/en-US/admin/settings/store") }
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
  scheduleSellerDetailsInvalidation: effects.invalidate,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordSettingsUpdatedAudit: effects.settingsUpdated,
}))

const MIGRATED_AT = new Date(Date.UTC(2026, 9, 16, 12))

const SELLER = {
  city: "Bochnia",
  countryCode: "PL",
  email: "kontakt@martebizuteria.pl",
  legalName: "Pyciak Mariusz Firma Jubilerska",
  nip: "8681772646",
  phone: "+48 663 150 820",
  postalCode: "32-700",
  regon: "384616568",
  street: "ul. Wąska 11",
} as const

const MOVED = { ...SELLER, city: "Kraków", postalCode: "31-001", street: "ul. Floriańska 1" }

beforeEach(() => {
  vi.clearAllMocks()
  effects.requestSession.mockResolvedValue({ user: { role: ROLES.ADMIN, twoFactorEnabled: true } })
  sqlite.exec("drop table if exists store_setting")
  applyMigration(sqlite, MIGRATION.STORE_SETTINGS)
  applyMigration(sqlite, MIGRATION.FREE_DELIVERY_THRESHOLD)
  sqlite.exec(`update store_setting set updated_at = ${String(MIGRATED_AT.getTime())}`)
  applyMigration(sqlite, MIGRATION.SELLER_DETAILS)
})

afterAll(() => {
  sqlite.close()
})

describe("seller details migration", () => {
  it("fills the settings row with the details the shop has published so far, stamped with the row's last change", async () => {
    await expect(readSellerDetails()).resolves.toStrictEqual({ ...SELLER, updatedAt: MIGRATED_AT })
  })

  it("gives a settings row created later empty details for the admin to fill in", async () => {
    sqlite.exec("delete from store_setting")
    await changeSalesPaused(true)

    await expect(readSellerDetails()).resolves.toStrictEqual({
      city: "",
      countryCode: "",
      email: "",
      legalName: "",
      nip: "",
      phone: "",
      postalCode: "",
      regon: "",
      street: "",
      updatedAt: new Date(0),
    })
  })
})

describe("readSellerDetails", () => {
  it("fails loudly when the settings row is missing instead of showing a shop without a seller", async () => {
    sqlite.exec("delete from store_setting")

    await expect(readSellerDetails()).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
  })
})

describe("saveSellerDetailsIfUnchanged", () => {
  it("saves the details and moves their stamp forward when nobody saved them in the meantime", async () => {
    const saved = await saveSellerDetailsIfUnchanged({ details: MOVED, expectedUpdatedAt: MIGRATED_AT })

    expect(saved).toMatchObject(MOVED)
    expect(saved?.updatedAt.getTime()).toBeGreaterThan(MIGRATED_AT.getTime())
    await expect(readSellerDetails()).resolves.toStrictEqual(saved)
  })

  it("saves nothing when someone saved the details after the admin loaded them", async () => {
    await expect(saveSellerDetailsIfUnchanged({ details: MOVED, expectedUpdatedAt: new Date(0) })).resolves.toBeUndefined()
    await expect(readSellerDetails()).resolves.toMatchObject(SELLER)
  })
})

describe("getSellerDetails", () => {
  it("tells anyone, signed in or not, who sells in the shop", async () => {
    effects.requestSession.mockResolvedValue(null)

    await expect(getSellerDetails()).resolves.toStrictEqual({ ...SELLER, updatedAt: MIGRATED_AT })
  })

  it("keys the storefront and admin reads apart so each realtime hub reaches its own", async () => {
    const queryClient = new QueryClient()

    expect(getSellerDetailsQuery().queryKey).toStrictEqual(STORE_SETTING_QUERY_KEYS.SELLER_DETAILS)
    expect(getAdminSellerDetailsQuery().queryKey).toStrictEqual(STORE_SETTING_QUERY_KEYS.ADMIN.SELLER_DETAILS)
    await expect(queryClient.query(getSellerDetailsQuery())).resolves.toMatchObject(SELLER)
    await expect(queryClient.query(getAdminSellerDetailsQuery())).resolves.toMatchObject(SELLER)
  })
})

describe("updateSellerDetails", () => {
  it("saves the new details, refreshes every open tab and records which fields changed from what to what", async () => {
    const saved = await updateSellerDetails({ data: { ...MOVED, expectedUpdatedAt: MIGRATED_AT } })

    expect(saved).toMatchObject(MOVED)
    await expect(readSellerDetails()).resolves.toStrictEqual(saved)
    expect(effects.invalidate).toHaveBeenCalledOnce()
    expect(effects.settingsUpdated).toHaveBeenCalledExactlyOnceWith("seller-details", {
      metadata: {
        changed: ["street", "postalCode", "city"],
        new: { city: "Kraków", postalCode: "31-001", street: "ul. Floriańska 1" },
        old: { city: "Bochnia", postalCode: "32-700", street: "ul. Wąska 11" },
      },
    })
  })

  it("stores the NIP and REGON as bare digits however the admin typed them", async () => {
    await updateSellerDetails({ data: { ...SELLER, expectedUpdatedAt: MIGRATED_AT, nip: "PL 526-025-02-74", regon: "100 000 050" } })

    await expect(readSellerDetails()).resolves.toMatchObject({ nip: "5260250274", regon: "100000050" })
  })

  it("records nothing, refreshes nothing and keeps the stamp when the details are saved unchanged", async () => {
    await expect(updateSellerDetails({ data: { ...SELLER, expectedUpdatedAt: new Date(0) } })).resolves.toStrictEqual({
      ...SELLER,
      updatedAt: MIGRATED_AT,
    })

    expect(effects.invalidate).not.toHaveBeenCalled()
    expect(effects.settingsUpdated).not.toHaveBeenCalled()
  })

  it("refuses to overwrite details someone saved after the admin loaded them", async () => {
    await expect(updateSellerDetails({ data: { ...MOVED, expectedUpdatedAt: new Date(0) } })).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
    })

    await expect(readSellerDetails()).resolves.toMatchObject(SELLER)
    expect(effects.settingsUpdated).not.toHaveBeenCalled()
  })

  it("refuses details that do not pass the checks", async () => {
    await expect(updateSellerDetails({ data: { ...SELLER, expectedUpdatedAt: MIGRATED_AT, nip: "8681772647" } })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
    })
    await expect(readSellerDetails()).resolves.toMatchObject(SELLER)
  })

  it("turns away a customer, who cannot manage the shop's settings", async () => {
    effects.requestSession.mockResolvedValue({ user: { role: ROLES.CUSTOMER } })

    await expect(updateSellerDetails({ data: { ...MOVED, expectedUpdatedAt: MIGRATED_AT } })).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
    })
    await expect(readSellerDetails()).resolves.toMatchObject(SELLER)
  })

  it("turns away a visitor who is not signed in", async () => {
    effects.requestSession.mockResolvedValue(null)

    await expect(updateSellerDetails({ data: { ...MOVED, expectedUpdatedAt: MIGRATED_AT } })).rejects.toMatchObject({
      code: ERROR_CODES.UNAUTHORIZED,
    })
  })

  it("keys the mutation and saves the details it is handed", async () => {
    expect(updateSellerDetailsMutation.mutationKey).toStrictEqual(STORE_SETTING_MUTATION_KEYS.UPDATE_SELLER_DETAILS)
    await expect(
      new MutationObserver(new QueryClient(), updateSellerDetailsMutation).mutate({ ...MOVED, expectedUpdatedAt: MIGRATED_AT }),
    ).resolves.toMatchObject(MOVED)
  })
})
