import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { ZodError } from "zod/v4"

import { LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"
import { AUDIT_LOG_ACTION, AUDIT_LOG_MUTATION_KEYS } from "~/src/modules/audit-log/audit-log.constants"

const accessor = vi.hoisted(() => ({ deleteAuditLogs: vi.fn((ids: readonly string[]) => Promise.resolve([...ids])) }))

const realtime = vi.hoisted(() => ({ scheduleAdminAuditLogInvalidation: vi.fn() }))

const audit = vi.hoisted(() => ({ recordAuditLogsDeletedAudit: vi.fn() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => realtime)
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

const FULFILLMENT_FAILED_ENTRY_ID = `${AUDIT_LOG_ACTION.ORDER_FULFILLMENT_FAILED}:cs_test_a1B2c3D4e5F6g7H8i9J0`

const REFUND_FAILED_ENTRY_ID = `${AUDIT_LOG_ACTION.ORDER_REFUND_FAILED}:re_3QabCdEfGhIjKlMn0pQrStUv`

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

  it("deletes the entries a failed fulfilment or refund records under its Stripe id, together with the others", async () => {
    const ids = [FIRST_ENTRY_ID, FULFILLMENT_FAILED_ENTRY_ID, REFUND_FAILED_ENTRY_ID]

    await expect(deleteAuditLogsMutation.mutationFn?.(ids, mutationContext)).resolves.toStrictEqual({ deleted: 3, ok: true })
    expect(accessor.deleteAuditLogs).toHaveBeenCalledExactlyOnceWith(ids)
  })

  it.each([
    ["an id the audit log never stores", "x".repeat(130_000)],
    ["a Stripe id under an action that keeps a uuid", `${AUDIT_LOG_ACTION.ORDER_PAYMENT_FAILED}:pi_3QabCdEf`],
    ["a Stripe id with characters Stripe never uses", `${AUDIT_LOG_ACTION.ORDER_REFUND_FAILED}:re_1 OR 1=1`],
    ["an empty Stripe id", `${AUDIT_LOG_ACTION.ORDER_REFUND_FAILED}:`],
    ["a Stripe id longer than Stripe makes them", `${AUDIT_LOG_ACTION.ORDER_FULFILLMENT_FAILED}:cs_${"a".repeat(253)}`],
  ])("refuses %s before deleting anything", (_case, id) => {
    expect(() => deleteAuditLogsMutation.mutationFn?.([FIRST_ENTRY_ID, id], mutationContext)).toThrow(ZodError)
    expect(accessor.deleteAuditLogs).not.toHaveBeenCalled()
  })

  it("schedules the refresh of the admin audit page and stats instead of waiting for it", async () => {
    await deleteAuditLogsMutation.mutationFn?.([FIRST_ENTRY_ID], mutationContext)

    expect(realtime.scheduleAdminAuditLogInvalidation).toHaveBeenCalledExactlyOnceWith()
  })
})
