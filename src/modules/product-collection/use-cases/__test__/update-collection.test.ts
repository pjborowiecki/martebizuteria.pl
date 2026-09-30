import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { errorCode } from "~/src/modules/_core/constants/errors"
import { updateCollection } from "~/src/modules/product-collection/use-cases/update-collection"

const operations = vi.hoisted(() => ({
  audit: vi.fn(),
  findByHandle: vi.fn(),
  invalidate: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: vi.fn() }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {
    update: () => ({
      set: (values: unknown) => {
        operations.updateSet(values)

        return { where: operations.updateWhere }
      },
    }),
  },
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleCollectionCatalogInvalidation: operations.invalidate,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordCatalogCollectionUpdatedAudit: operations.audit,
}))
vi.mock("~/src/modules/product-collection/product-collection.server", () => ({
  getCollectionByHandleQuery: { execute: operations.findByHandle },
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

const ID = "0195f0c0-0000-7000-8000-000000000001"

const input = {
  descriptions: { "en-US": "Everyday silver", "pl-PL": "Srebro na co dzień" },
  handle: "srebro-925",
  id: ID,
  image: "",
  status: "active" as const,
  titles: { "en-US": " Silver 925 ", "pl-PL": "Srebro 925" },
}

describe("updateCollection", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    operations.findByHandle.mockResolvedValue(undefined)
    operations.updateWhere.mockResolvedValue(undefined)
  })

  it("returns the handle and id it saved", async () => {
    await expect(updateCollection({ data: input })).resolves.toStrictEqual({ handle: "srebro-925", id: ID })
  })

  it("trims the titles it writes", async () => {
    await updateCollection({ data: input })

    expect(operations.updateSet).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ titles: { "en-US": "Silver 925", "pl-PL": "Srebro 925" } }),
    )
  })

  it("does not write a rank so the collection keeps its place", async () => {
    await updateCollection({ data: input })

    expect(operations.updateSet.mock.calls[0]?.[0]).not.toHaveProperty("rank")
  })

  it("leaves the stored image alone when the field is cleared", async () => {
    await updateCollection({ data: input })

    expect(operations.updateSet).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ image: undefined }))
  })

  it("drops a description that is blank in every locale", async () => {
    await updateCollection({ data: { ...input, descriptions: { "en-US": "", "pl-PL": "   " } } })

    expect(operations.updateSet).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ descriptions: undefined }))
  })

  it("invalidates the storefront and audits the update", async () => {
    await updateCollection({ data: input })

    expect(operations.invalidate).toHaveBeenCalledOnce()
    expect(operations.audit).toHaveBeenCalledExactlyOnceWith("srebro-925")
  })

  it("accepts the handle the collection already owns", async () => {
    operations.findByHandle.mockResolvedValue({ handle: "srebro-925", id: ID })

    await expect(updateCollection({ data: input })).resolves.toStrictEqual({ handle: "srebro-925", id: ID })
    expect(operations.updateSet).toHaveBeenCalledOnce()
  })

  it("refuses a handle another collection already owns", async () => {
    operations.findByHandle.mockResolvedValue({ handle: "srebro-925", id: "another-collection" })

    await expect(updateCollection({ data: input }).catch((error: unknown) => errorCode(error))).resolves.toBe("CONFLICT")
    expect(operations.updateSet).not.toHaveBeenCalled()
    expect(operations.invalidate).not.toHaveBeenCalled()
  })

  it("rejects an id that is not a uuid", async () => {
    await expect(updateCollection({ data: { ...input, id: "not-a-uuid" } })).rejects.toThrow()
    expect(operations.findByHandle).not.toHaveBeenCalled()
  })
})

it("stores a supplied collection image", async () => {
  operations.findByHandle.mockResolvedValue(undefined)
  await updateCollection({ data: { ...input, image: "collections/silver.webp" } })
  expect(operations.updateSet).toHaveBeenLastCalledWith(expect.objectContaining({ image: "collections/silver.webp" }))
})
