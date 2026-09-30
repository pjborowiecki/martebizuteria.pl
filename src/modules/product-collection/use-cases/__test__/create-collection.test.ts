import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { errorCode } from "~/src/modules/_core/constants/errors"
import { createCollection } from "~/src/modules/product-collection/use-cases/create-collection"

const operations = vi.hoisted(() => ({
  audit: vi.fn(),
  findByHandle: vi.fn(),
  insertValues: vi.fn(),
  invalidate: vi.fn(),
  maxRank: vi.fn(),
  uuid: vi.fn(),
}))

vi.mock("uuid", () => ({ v7: operations.uuid }))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: vi.fn() }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: { insert: () => ({ values: operations.insertValues }) },
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleCollectionCatalogInvalidation: operations.invalidate,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordCatalogCollectionCreatedAudit: operations.audit,
}))
vi.mock("~/src/modules/product-collection/product-collection.server", () => ({
  getCollectionByHandleQuery: { execute: operations.findByHandle },
  getMaxRankQuery: { execute: operations.maxRank },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { validate: ((input: unknown) => unknown) | undefined } = { validate: undefined }
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => async (options: { data: unknown }) => {
        await Promise.resolve()

        return handler({ data: state.validate === undefined ? options.data : state.validate(options.data) })
      },
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        state.validate = validate

        return builder
      },
    }

    return builder
  },
}))

const input = {
  descriptions: { "en-US": "Everyday silver", "pl-PL": "Srebro na co dzień" },
  handle: "srebro-925",
  image: "",
  status: "active" as const,
  titles: { "en-US": "Silver 925", "pl-PL": "Srebro 925" },
}

describe("createCollection", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    operations.findByHandle.mockResolvedValue(undefined)
    operations.maxRank.mockResolvedValue([{ value: 4 }])
    operations.insertValues.mockResolvedValue(undefined)
    operations.uuid.mockReturnValue("collection-1")
  })

  it("returns the handle and the generated id", async () => {
    await expect(createCollection({ data: input })).resolves.toStrictEqual({ handle: "srebro-925", id: "collection-1" })
  })

  it("appends the new collection after the current highest rank", async () => {
    await createCollection({ data: input })

    expect(operations.insertValues).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ handle: "srebro-925", id: "collection-1", rank: 5, status: "active" }),
    )
  })

  it("ranks the first collection zero when the table is empty", async () => {
    operations.maxRank.mockResolvedValue([])

    await createCollection({ data: input })

    expect(operations.insertValues).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ rank: 0 }))
  })

  it("stores an empty image as undefined rather than a blank string", async () => {
    await createCollection({ data: input })

    expect(operations.insertValues).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ image: undefined }))
  })

  it("keeps a supplied image", async () => {
    await createCollection({ data: { ...input, image: " collections/silver.webp " } })

    expect(operations.insertValues).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ image: "collections/silver.webp" }))
  })

  it("drops a description that is blank in every locale", async () => {
    await createCollection({ data: { ...input, descriptions: { "en-US": "  ", "pl-PL": "" } } })

    expect(operations.insertValues).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ descriptions: undefined }))
  })

  it("invalidates the storefront and audits the creation", async () => {
    await createCollection({ data: input })

    expect(operations.invalidate).toHaveBeenCalledOnce()
    expect(operations.audit).toHaveBeenCalledExactlyOnceWith("srebro-925")
  })

  it("refuses a handle that already exists", async () => {
    operations.findByHandle.mockResolvedValue({ handle: "srebro-925", id: "existing" })

    await expect(createCollection({ data: input })).rejects.toThrow("DUPLICATE_HANDLE")
  })

  it("reports the duplicate handle as a conflict and writes nothing", async () => {
    operations.findByHandle.mockResolvedValue({ handle: "srebro-925", id: "existing" })

    await expect(createCollection({ data: input }).catch((error: unknown) => errorCode(error))).resolves.toBe("CONFLICT")
    expect(operations.insertValues).not.toHaveBeenCalled()
    expect(operations.invalidate).not.toHaveBeenCalled()
    expect(operations.audit).not.toHaveBeenCalled()
  })

  it("rejects a handle that is not a slug before touching the database", async () => {
    await expect(createCollection({ data: { ...input, handle: "Srebro 925" } })).rejects.toThrow()
    expect(operations.findByHandle).not.toHaveBeenCalled()
  })

  it("rejects a collection whose title is missing in one locale", async () => {
    await expect(createCollection({ data: { ...input, titles: { "en-US": "Silver 925", "pl-PL": "  " } } })).rejects.toThrow()
    expect(operations.insertValues).not.toHaveBeenCalled()
  })
})
