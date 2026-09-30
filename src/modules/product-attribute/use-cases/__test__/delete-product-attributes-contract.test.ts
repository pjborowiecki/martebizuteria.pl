import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const server = vi.hoisted(() => ({
  countForAttributeIds: vi.fn<(ids: readonly string[]) => Promise<number>>(),
  deleteProductAttributes: vi.fn<(ids: readonly string[]) => Promise<void>>(),
  getProductAttributesByIds: vi.fn<(ids: readonly string[]) => Promise<readonly { handle: string; id: string }[]>>(),
}))

const audit = vi.hoisted(() => ({ deleted: vi.fn(), schedule: vi.fn() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductAttributeCatalogInvalidation: audit.schedule,
}))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.server", () => ({
  countForAttributeIds: server.countForAttributeIds,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordCatalogAttributeDeletedAudit: audit.deleted,
  resolveAuthAuditActor: (user: { email: string }) => `actor:${user.email}`,
}))
vi.mock("~/src/modules/audit-log/audit-log.record.server", () => ({ resolveRequestAuditIp: () => "198.51.100.4" }))
vi.mock("~/src/modules/product-attribute/product-attribute.server", () => ({
  deleteProductAttributes: server.deleteProductAttributes,
  getProductAttributesByIds: server.getProductAttributesByIds,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler:
        (handler: (options: { context: unknown; data: unknown }) => unknown) =>
        (options?: { data?: unknown }): unknown =>
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

import { PRODUCT_ATTRIBUTE_MUTATION_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"
import {
  deleteProductAttributes,
  deleteProductAttributesMutation,
} from "~/src/modules/product-attribute/use-cases/delete-product-attributes"

const mutationContext = () => ({ client: new QueryClient(), meta: undefined, signal: AbortSignal.abort() })

beforeEach(() => {
  vi.clearAllMocks()
  server.countForAttributeIds.mockResolvedValue(0)
  server.deleteProductAttributes.mockResolvedValue(undefined)
  server.getProductAttributesByIds.mockResolvedValue([])
})

describe("deleteProductAttributes input validation", () => {
  it("trims the submitted ids before the usage check and the delete", async () => {
    await deleteProductAttributes({ data: ["  attribute-1  "] })

    expect(server.countForAttributeIds).toHaveBeenCalledWith(["attribute-1"])
    expect(server.deleteProductAttributes).toHaveBeenCalledWith(["attribute-1"])
  })

  it("refuses an empty selection without touching the database", async () => {
    await expect(Promise.resolve().then(() => deleteProductAttributes({ data: [] }))).rejects.toThrow()
    expect(server.countForAttributeIds).not.toHaveBeenCalled()
    expect(server.deleteProductAttributes).not.toHaveBeenCalled()
  })

  it("refuses an id made only of whitespace", async () => {
    await expect(Promise.resolve().then(() => deleteProductAttributes({ data: ["   "] }))).rejects.toThrow()
    expect(server.deleteProductAttributes).not.toHaveBeenCalled()
  })
})

describe("deleteProductAttributesMutation", () => {
  it("deletes the ids it is handed and reports how many went", async () => {
    server.getProductAttributesByIds.mockResolvedValue([{ handle: "material", id: "attribute-1" }])

    await expect(deleteProductAttributesMutation.mutationFn?.(["attribute-1"], mutationContext())).resolves.toStrictEqual({
      deleted: 1,
      ok: true,
    })
    expect(server.deleteProductAttributes).toHaveBeenCalledWith(["attribute-1"])
    expect(audit.deleted).toHaveBeenCalledWith("material", {
      actor: "actor:admin@example.test",
      ip: "198.51.100.4",
      metadata: { handle: "material" },
      resourceId: "attribute-1",
    })
  })

  it("schedules the catalog invalidation through the mutation as well", async () => {
    await deleteProductAttributesMutation.mutationFn?.(["attribute-1"], mutationContext())

    expect(audit.schedule).toHaveBeenCalledTimes(1)
  })

  it("is keyed so the attributes table can watch the delete in flight", () => {
    expect(deleteProductAttributesMutation.mutationKey).toStrictEqual(PRODUCT_ATTRIBUTE_MUTATION_KEYS.DELETE)
  })
})
