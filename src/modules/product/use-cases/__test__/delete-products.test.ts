import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { deleteProductRows, recordCatalogProductDeletedAudit, scheduleProductCatalogInvalidation } = vi.hoisted(() => ({
  deleteProductRows: vi.fn<(ids: readonly string[]) => Promise<void>>(),
  recordCatalogProductDeletedAudit: vi.fn<(target: string) => void>(),
  scheduleProductCatalogInvalidation: vi.fn<() => void>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({ scheduleProductCatalogInvalidation }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordCatalogProductDeletedAudit }))
vi.mock("~/src/modules/product/product.mutations", () => ({ deleteProducts: deleteProductRows }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { validator?: (input: unknown) => unknown } = {}
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) =>
        Promise.resolve(options.data)
          .then((data) => (state.validator === undefined ? data : state.validator(data)))
          .then((data) => handler({ data })),
      middleware: () => builder,
      validator: (validator: (input: unknown) => unknown) => {
        state.validator = validator

        return builder
      },
    }

    return builder
  },
}))

import { PRODUCT_MUTATION_KEYS } from "~/src/modules/product/product.constants"
import { deleteProducts, deleteProductsMutation } from "~/src/modules/product/use-cases/delete-products"

const FIRST_ID = "0195b6f4-0000-7000-8000-000000000001"

const SECOND_ID = "0195b6f4-0000-7000-8000-000000000002"

beforeEach(() => {
  vi.clearAllMocks()
  deleteProductRows.mockResolvedValue()
})

describe("deleteProducts", () => {
  it("deletes exactly the products it was given", async () => {
    await deleteProducts({ data: [FIRST_ID, SECOND_ID] })

    expect(deleteProductRows).toHaveBeenCalledWith([FIRST_ID, SECOND_ID])
  })

  it("reports how many products were deleted", async () => {
    await expect(deleteProducts({ data: [FIRST_ID, SECOND_ID] })).resolves.toStrictEqual({ deleted: 2, ok: true })
  })

  it("refreshes the storefront catalog after the rows are gone", async () => {
    const order: string[] = []
    deleteProductRows.mockImplementation(() => {
      order.push("rows")

      return Promise.resolve()
    })
    scheduleProductCatalogInvalidation.mockImplementation(() => {
      order.push("invalidation")
    })

    await deleteProducts({ data: [FIRST_ID] })

    expect(order).toStrictEqual(["rows", "invalidation"])
  })

  it("records one audit entry naming every deleted product", async () => {
    await deleteProducts({ data: [FIRST_ID, SECOND_ID] })

    expect(recordCatalogProductDeletedAudit).toHaveBeenCalledWith(`${FIRST_ID}, ${SECOND_ID}`)
  })

  it("rejects an empty selection before deleting anything", async () => {
    await expect(deleteProducts({ data: [] })).rejects.toThrow()

    expect(deleteProductRows).not.toHaveBeenCalled()
  })

  it("rejects a selection that holds a blank product id", async () => {
    await expect(deleteProducts({ data: [""] })).rejects.toThrow()

    expect(deleteProductRows).not.toHaveBeenCalled()
  })

  it("neither invalidates nor audits when the deletion fails", async () => {
    deleteProductRows.mockRejectedValue(new Error("FOREIGN KEY constraint failed"))

    await expect(deleteProducts({ data: [FIRST_ID] })).rejects.toThrow("FOREIGN KEY constraint failed")

    expect(scheduleProductCatalogInvalidation).not.toHaveBeenCalled()
    expect(recordCatalogProductDeletedAudit).not.toHaveBeenCalled()
  })
})

describe("deleteProductsMutation", () => {
  it("is keyed for the product deletion", () => {
    expect(deleteProductsMutation.mutationKey).toStrictEqual(PRODUCT_MUTATION_KEYS.DELETE)
  })

  it("forwards its input to the server function", async () => {
    await deleteProductsMutation.mutationFn?.([FIRST_ID], { client: new QueryClient(), meta: undefined })

    expect(deleteProductRows).toHaveBeenCalledWith([FIRST_ID])
  })
})
