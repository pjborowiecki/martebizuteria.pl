import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_MUTATION_KEYS, AUDIT_LOG_QUERY_KEYS } from "~/src/modules/audit-log/audit-log.constants"

const accessor = vi.hoisted(() => ({ deleteAuditLogs: vi.fn((ids: readonly string[]) => Promise.resolve(ids.length)) }))

const publish = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server", () => ({
  publishRealtimeInvalidation: publish,
}))
vi.mock("~/src/modules/audit-log/audit-log.accessors", () => ({ deleteAuditLogs: accessor.deleteAuditLogs }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options?: { data?: unknown }) => handler({ data: options?.data }),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        Object.assign(builder, {
          handler: (handler: (options: { data: unknown }) => unknown) => (options?: { data?: unknown }) =>
            handler({ data: validate(options?.data) }),
        })

        return builder
      },
    }

    return builder
  },
}))

const { deleteAuditLogsMutation } = await import("~/src/modules/audit-log/use-cases/delete-audit-logs")

const mutationContext = { client: new QueryClient(), meta: undefined }

describe("deleteAuditLogsMutation", () => {
  it("is keyed under the audit log delete key", () => {
    expect(deleteAuditLogsMutation.mutationKey).toStrictEqual(AUDIT_LOG_MUTATION_KEYS.DELETE)
  })

  it("sends the selected ids to the server function and returns how many were removed", async () => {
    await expect(deleteAuditLogsMutation.mutationFn?.(["log-1", "log-2"], mutationContext)).resolves.toStrictEqual({
      deleted: 2,
      ok: true,
    })
    expect(accessor.deleteAuditLogs).toHaveBeenCalledWith(["log-1", "log-2"])
  })

  it("invalidates the admin audit page and stats after the deletion", async () => {
    await deleteAuditLogsMutation.mutationFn?.(["log-1"], mutationContext)

    expect(publish).toHaveBeenLastCalledWith({ admin: [AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, AUDIT_LOG_QUERY_KEYS.ADMIN.STATS] })
  })
})
