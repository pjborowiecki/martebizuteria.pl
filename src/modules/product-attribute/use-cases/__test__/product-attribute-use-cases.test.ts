import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { AppError } from "~/src/modules/_core/constants/errors"
import { PRODUCT_ATTRIBUTE_MUTATION_KEYS, PRODUCT_ATTRIBUTE_QUERY_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"

import { createProductAttribute } from "../create-product-attribute"
import { deleteProductAttributes, deleteProductAttributesMutation } from "../delete-product-attributes"
import { getAdminProductAttributes, getAdminProductAttributesQuery } from "../get-admin-product-attributes"
import { getProductAttributeStats, getProductAttributeStatsQuery } from "../get-product-attribute-stats"
import { reorderProductAttributes, reorderProductAttributesMutation } from "../reorder-product-attributes"
import { updateProductAttribute } from "../update-product-attribute"

const database = vi.hoisted(() => {
  const updateWhere = vi.fn(() => Promise.resolve(undefined))

  return {
    insertValues: vi.fn((values: Record<string, unknown>) => Promise.resolve(values)),
    updateSet: vi.fn((values: Record<string, unknown>) => ({ values, where: updateWhere })),
    updateWhere,
  }
})

const server = vi.hoisted(() => ({
  countForAttributeIds: vi.fn(() => Promise.resolve(0)),
  deleteProductAttributes: vi.fn(() => Promise.resolve(undefined)),
  getAdminProductAttributeListItems: vi.fn(() => Promise.resolve<readonly unknown[]>([])),
  getNextProductAttributeRank: vi.fn(() => Promise.resolve(7)),
  getProductAttributeByHandle: vi.fn(() => Promise.resolve<{ id: string } | undefined>(undefined)),
  getProductAttributesByIds: vi.fn(() => Promise.resolve<readonly { handle: string; id: string }[]>([])),
  setProductAttributeRanks: vi.fn(() => Promise.resolve(undefined)),
}))

const audit = vi.hoisted(() => ({
  created: vi.fn(),
  deleted: vi.fn(),
  scheduleInvalidation: vi.fn(),
  updated: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    insert: () => ({ values: database.insertValues }),
    update: () => ({ set: database.updateSet }),
  },
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductAttributeCatalogInvalidation: audit.scheduleInvalidation,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordCatalogAttributeCreatedAudit: audit.created,
  recordCatalogAttributeDeletedAudit: audit.deleted,
  recordCatalogAttributeUpdatedAudit: audit.updated,
  resolveAuthAuditActor: (user: { email: string }) => `actor:${user.email}`,
}))
vi.mock("~/src/modules/audit-log/audit-log.record.server", () => ({
  resolveRequestAuditIp: () => "203.0.113.7",
}))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.server", () => ({
  countForAttributeIds: server.countForAttributeIds,
}))
vi.mock("~/src/modules/product-attribute/product-attribute.server", () => ({
  deleteProductAttributes: server.deleteProductAttributes,
  getAdminProductAttributeListItems: server.getAdminProductAttributeListItems,
  getNextProductAttributeRank: server.getNextProductAttributeRank,
  getProductAttributeByHandleQuery: { execute: server.getProductAttributeByHandle },
  getProductAttributesByIds: server.getProductAttributesByIds,
  setProductAttributeRanks: server.setProductAttributeRanks,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: unknown; data: unknown }) => unknown) => (options?: { data?: unknown }) =>
        handler({ context: { auth: { user: { email: "admin@example.test" } } }, data: builder.validate(options?.data) }),
      middleware: () => builder,
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate
        return builder
      },
    }

    return builder
  },
}))

const titles = { "en-US": "  Material  ", "pl-PL": " Materiał " }

const selectInput = {
  allowedValues: [{ labels: { "en-US": " Gold ", "pl-PL": " Złoto " }, value: "gold" }],
  handle: "material",
  titles,
  type: "select" as const,
  unit: "",
}

describe("createProductAttribute", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.getProductAttributeByHandle.mockResolvedValue(undefined)
    server.getNextProductAttributeRank.mockResolvedValue(7)
  })

  it("trims locale titles and allowed value labels before inserting", async () => {
    const result = await createProductAttribute({ data: selectInput })

    expect(database.insertValues).toHaveBeenCalledTimes(1)
    expect(database.insertValues.mock.calls[0]?.[0]).toStrictEqual({
      allowedValues: [{ labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" }],
      handle: "material",
      id: result.id,
      rank: 7,
      titles: { "en-US": "Material", "pl-PL": "Materiał" },
      type: "select",
      unit: undefined,
    })
    expect(result.handle).toBe("material")
    expect(result.id).toHaveLength(UUID_STRING_LENGTH)
  })

  it("drops allowed values for types that cannot carry choices and keeps a non-empty unit", async () => {
    await createProductAttribute({ data: { ...selectInput, type: "number", unit: "mm" } })

    expect(database.insertValues.mock.calls[0]?.[0]).toMatchObject({ allowedValues: undefined, unit: "mm" })
  })

  it("schedules catalog invalidation and records the creation audit", async () => {
    const result = await createProductAttribute({ data: selectInput })

    expect(audit.scheduleInvalidation).toHaveBeenCalledTimes(1)
    expect(audit.created).toHaveBeenCalledWith("material", { resourceId: result.id })
  })

  it("rejects a handle that already exists without touching the database", async () => {
    server.getProductAttributeByHandle.mockResolvedValue({ id: "existing" })

    await expect(createProductAttribute({ data: selectInput })).rejects.toThrow(AppError)
    expect(database.insertValues).not.toHaveBeenCalled()
    expect(audit.scheduleInvalidation).not.toHaveBeenCalled()
  })
})

describe("updateProductAttribute", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.getProductAttributeByHandle.mockResolvedValue(undefined)
  })

  it("writes the normalized row and audits the update", async () => {
    const result = await updateProductAttribute({ data: { ...selectInput, id: "attribute-1" } })

    expect(database.updateSet.mock.calls[0]?.[0]).toStrictEqual({
      allowedValues: [{ labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" }],
      handle: "material",
      titles: { "en-US": "Material", "pl-PL": "Materiał" },
      type: "select",
      unit: undefined,
    })
    expect(database.updateWhere).toHaveBeenCalledTimes(1)
    expect(audit.updated).toHaveBeenCalledWith("material", { resourceId: "attribute-1" })
    expect(result).toStrictEqual({ handle: "material", id: "attribute-1" })
  })

  it("allows a row to keep its own handle", async () => {
    server.getProductAttributeByHandle.mockResolvedValue({ id: "attribute-1" })

    await expect(updateProductAttribute({ data: { ...selectInput, id: "attribute-1" } })).resolves.toStrictEqual({
      handle: "material",
      id: "attribute-1",
    })
  })

  it("rejects a handle owned by another row", async () => {
    server.getProductAttributeByHandle.mockResolvedValue({ id: "attribute-2" })

    await expect(updateProductAttribute({ data: { ...selectInput, id: "attribute-1" } })).rejects.toThrow("DUPLICATE_HANDLE")
    expect(database.updateSet).not.toHaveBeenCalled()
  })
})

describe("deleteProductAttributes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.countForAttributeIds.mockResolvedValue(0)
    server.getProductAttributesByIds.mockResolvedValue([])
  })

  it("refuses to delete attributes that products still reference", async () => {
    server.countForAttributeIds.mockResolvedValue(3)

    await expect(deleteProductAttributes({ data: ["attribute-1"] })).rejects.toThrow("IN_USE")
    expect(server.deleteProductAttributes).not.toHaveBeenCalled()
  })

  it("audits every deleted attribute with the resolved actor and request ip", async () => {
    server.getProductAttributesByIds.mockResolvedValue([
      { handle: "material", id: "attribute-1" },
      { handle: "finish", id: "attribute-2" },
    ])

    const result = await deleteProductAttributes({ data: ["attribute-1", "attribute-2"] })

    expect(server.deleteProductAttributes).toHaveBeenCalledWith(["attribute-1", "attribute-2"])
    expect(result).toStrictEqual({ deleted: 2, ok: true })
    expect(audit.deleted).toHaveBeenCalledTimes(2)
    expect(audit.deleted).toHaveBeenNthCalledWith(1, "material", {
      actor: "actor:admin@example.test",
      ip: "203.0.113.7",
      metadata: { handle: "material" },
      resourceId: "attribute-1",
    })
  })

  it("exposes a stable delete mutation key", () => {
    expect(deleteProductAttributesMutation.mutationKey).toStrictEqual(PRODUCT_ATTRIBUTE_MUTATION_KEYS.DELETE)
  })
})

describe("reorderProductAttributes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("turns the ordered id list into zero based ranks", async () => {
    const result = await reorderProductAttributes({ data: ["third", "first", "second"] })

    expect(server.setProductAttributeRanks).toHaveBeenCalledWith([
      { id: "third", rank: 0 },
      { id: "first", rank: 1 },
      { id: "second", rank: 2 },
    ])
    expect(audit.scheduleInvalidation).toHaveBeenCalledTimes(1)
    expect(result).toStrictEqual({ ok: true })
  })

  it("exposes a stable reorder mutation key", () => {
    expect(reorderProductAttributesMutation.mutationKey).toStrictEqual(PRODUCT_ATTRIBUTE_MUTATION_KEYS.REORDER)
  })
})

describe("product attribute admin reads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the accessor rows untouched for the admin list", async () => {
    const rows = [{ handle: "material", id: "attribute-1", productCount: 2, type: "select" }]
    server.getAdminProductAttributeListItems.mockResolvedValue(rows)

    await expect(getAdminProductAttributes()).resolves.toBe(rows)
    expect(getAdminProductAttributesQuery().queryKey).toStrictEqual(PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.ALL)
  })

  it("counts usage and choice carrying types for the stats cards", async () => {
    server.getAdminProductAttributeListItems.mockResolvedValue([
      { productCount: 2, type: "select" },
      { productCount: 0, type: "multiselect" },
      { productCount: 0, type: "text" },
    ])

    await expect(getProductAttributeStats()).resolves.toStrictEqual({ inUse: 1, total: 3, unused: 2, withChoices: 2 })
    expect(getProductAttributeStatsQuery().queryKey).toStrictEqual(PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.STATS)
  })
})

it("loads attribute usage statistics through the cache query", async () => {
  server.getAdminProductAttributeListItems.mockResolvedValue([{ productCount: 1, type: "text" }])
  await expect(new QueryClient().query(getProductAttributeStatsQuery())).resolves.toStrictEqual({
    inUse: 1,
    total: 1,
    unused: 0,
    withChoices: 0,
  })
})

it("rejects invalid attribute creation before any writes", () => {
  database.insertValues.mockClear()
  expect(() => createProductAttribute({ data: { ...selectInput, handle: "" } })).toThrow()
  expect(database.insertValues).not.toHaveBeenCalled()
})

it("updates a numeric attribute's unit without preserving select choices", async () => {
  server.getProductAttributeByHandle.mockResolvedValue(undefined)
  await updateProductAttribute({ data: { ...selectInput, id: "attribute-1", type: "number", unit: "mm" } })
  expect(database.updateSet).toHaveBeenLastCalledWith(expect.objectContaining({ allowedValues: undefined, type: "number", unit: "mm" }))
})
