import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { ZodError } from "zod/v4"

import { LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"
import { AUDIT_LOG_MUTATION_KEYS, AUDIT_LOG_QUERY_KEYS } from "~/src/modules/audit-log/audit-log.constants"

const accessor = vi.hoisted(() => ({ deleteAuditLogs: vi.fn((ids: readonly string[]) => Promise.resolve([...ids])) }))

const publish = vi.hoisted(() => vi.fn(() => Promise.resolve(undefined)))

const audit = vi.hoisted(() => ({ recordAuditLogsDeletedAudit: vi.fn() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.publish.server", () => ({
  publishRealtimeInvalidation: publish,
}))
vi.mock("~/src/modules/audit-log/audit-log.accessors", () => ({ deleteAuditLogs: accessor.deleteAuditLogs }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => audit)
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

const entryId = (index: number): string => `0192f3a4-5b6c-7d8e-9fab-${index.toString(16).padStart(12, "0")}`

const FIRST_ENTRY_ID = entryId(1)

const SECOND_ENTRY_ID = entryId(2)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("deleteAuditLogsMutation", () => {
  it("is keyed under the audit log delete key", () => {
    expect(deleteAuditLogsMutation.mutationKey).toStrictEqual(AUDIT_LOG_MUTATION_KEYS.DELETE)
  })

  it("sends the selected ids to the server function and returns how many were removed", async () => {
    await expect(deleteAuditLogsMutation.mutationFn?.([FIRST_ENTRY_ID, SECOND_ENTRY_ID], mutationContext)).resolves.toStrictEqual({
      deleted: 2,
      ok: true,
    })
    expect(accessor.deleteAuditLogs).toHaveBeenCalledWith([FIRST_ENTRY_ID, SECOND_ENTRY_ID])
  })

  it("records who deleted how many entries, and which, in the audit log itself", async () => {
    await deleteAuditLogsMutation.mutationFn?.([FIRST_ENTRY_ID, SECOND_ENTRY_ID], mutationContext)

    expect(audit.recordAuditLogsDeletedAudit).toHaveBeenCalledWith("2", { metadata: { ids: [FIRST_ENTRY_ID, SECOND_ENTRY_ID] } })
  })

  it("counts and lists only the entries the delete removed, not every id it was sent", async () => {
    accessor.deleteAuditLogs.mockResolvedValueOnce([SECOND_ENTRY_ID])

    await expect(deleteAuditLogsMutation.mutationFn?.([FIRST_ENTRY_ID, SECOND_ENTRY_ID], mutationContext)).resolves.toStrictEqual({
      deleted: 1,
      ok: true,
    })
    expect(audit.recordAuditLogsDeletedAudit).toHaveBeenCalledExactlyOnceWith("1", { metadata: { ids: [SECOND_ENTRY_ID] } })
  })

  it("records nothing when none of the entries was still there to delete", async () => {
    accessor.deleteAuditLogs.mockResolvedValueOnce([])

    await expect(deleteAuditLogsMutation.mutationFn?.([FIRST_ENTRY_ID], mutationContext)).resolves.toStrictEqual({
      deleted: 0,
      ok: true,
    })
    expect(audit.recordAuditLogsDeletedAudit).not.toHaveBeenCalled()
  })

  it("accepts a full page of selected entries", async () => {
    const ids = Array.from({ length: LIST_PAGE_SIZE_MAX }, (_, index) => entryId(index))

    await expect(deleteAuditLogsMutation.mutationFn?.(ids, mutationContext)).resolves.toStrictEqual({
      deleted: LIST_PAGE_SIZE_MAX,
      ok: true,
    })
  })

  it("refuses more ids than the largest page holds before deleting anything", () => {
    const ids = Array.from({ length: LIST_PAGE_SIZE_MAX + 1 }, (_, index) => entryId(index))

    expect(() => deleteAuditLogsMutation.mutationFn?.(ids, mutationContext)).toThrow(ZodError)
    expect(accessor.deleteAuditLogs).not.toHaveBeenCalled()
  })

  it("refuses an id that is not an audit entry's uuid before deleting anything", () => {
    expect(() => deleteAuditLogsMutation.mutationFn?.([FIRST_ENTRY_ID, "x".repeat(130_000)], mutationContext)).toThrow(ZodError)
    expect(accessor.deleteAuditLogs).not.toHaveBeenCalled()
  })

  it("invalidates the admin audit page and stats after the deletion", async () => {
    await deleteAuditLogsMutation.mutationFn?.([FIRST_ENTRY_ID], mutationContext)

    expect(publish).toHaveBeenLastCalledWith({ admin: [AUDIT_LOG_QUERY_KEYS.ADMIN.PAGE, AUDIT_LOG_QUERY_KEYS.ADMIN.STATS] })
  })
})
