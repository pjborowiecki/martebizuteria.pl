import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { errorCode } from "~/src/modules/_core/constants/errors"
import { COLLECTION_MUTATION_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { deleteCollections, deleteCollectionsMutation } from "~/src/modules/product-collection/use-cases/delete-collections"

const operations = vi.hoisted(() => ({
  audit: vi.fn(),
  countProducts: vi.fn(),
  invalidate: vi.fn(),
  removeRows: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: vi.fn() }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleCollectionCatalogInvalidation: operations.invalidate,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordCatalogCollectionDeletedAudit: operations.audit,
}))
vi.mock("~/src/modules/collection-on-product/collection-on-product.accessors", () => ({
  countProductsForCollections: operations.countProducts,
}))
vi.mock("~/src/modules/product-collection/product-collection.server", () => ({
  deleteCollections: operations.removeRows,
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

const FIRST = "0195f0c0-0000-7000-8000-000000000001"

const SECOND = "0195f0c0-0000-7000-8000-000000000002"

describe("deleteCollections", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    operations.countProducts.mockResolvedValue(0)
    operations.removeRows.mockResolvedValue(undefined)
  })

  it("reports how many collections it removed", async () => {
    await expect(deleteCollections({ data: [FIRST, SECOND] })).resolves.toStrictEqual({ deleted: 2, ok: true })
  })

  it("removes exactly the ids it was given", async () => {
    await deleteCollections({ data: [FIRST, SECOND] })

    expect(operations.removeRows).toHaveBeenCalledExactlyOnceWith([FIRST, SECOND])
  })

  it("invalidates the storefront and audits every removed id", async () => {
    await deleteCollections({ data: [FIRST, SECOND] })

    expect(operations.invalidate).toHaveBeenCalledOnce()
    expect(operations.audit).toHaveBeenCalledExactlyOnceWith(`${FIRST}, ${SECOND}`)
  })

  it("refuses to delete a collection that still holds products", async () => {
    operations.countProducts.mockResolvedValue(1)

    await expect(deleteCollections({ data: [FIRST] }).catch((error: unknown) => errorCode(error))).resolves.toBe("CONFLICT")
    expect(operations.removeRows).not.toHaveBeenCalled()
    expect(operations.invalidate).not.toHaveBeenCalled()
  })

  it("names the reason a populated collection cannot be deleted", async () => {
    operations.countProducts.mockResolvedValue(3)

    await expect(deleteCollections({ data: [FIRST] })).rejects.toThrow("HAS_PRODUCTS")
  })

  it("rejects an empty selection", async () => {
    await expect(deleteCollections({ data: [] })).rejects.toThrow()
    expect(operations.countProducts).not.toHaveBeenCalled()
  })

  it("rejects an id that is not a uuid", async () => {
    await expect(deleteCollections({ data: ["collection-1"] })).rejects.toThrow()
    expect(operations.countProducts).not.toHaveBeenCalled()
  })
})

describe("deleteCollectionsMutation", () => {
  it("is keyed so the admin list can track it", () => {
    expect(deleteCollectionsMutation.mutationKey).toStrictEqual(COLLECTION_MUTATION_KEYS.DELETE)
  })
})

it("deletes the selected collections through its mutation", async () => {
  operations.countProducts.mockResolvedValue(0)
  operations.removeRows.mockResolvedValue(undefined)
  await expect(deleteCollectionsMutation.mutationFn?.([FIRST], { client: new QueryClient(), meta: undefined })).resolves.toStrictEqual({
    deleted: 1,
    ok: true,
  })
  expect(operations.removeRows).toHaveBeenLastCalledWith([FIRST])
})
