import { type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const deleteAuditLogs = vi.hoisted(() => vi.fn())

const toastSpies = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock("~/src/modules/audit-log/use-cases/delete-audit-logs", () => ({
  deleteAuditLogsMutation: { mutationFn: deleteAuditLogs, mutationKey: ["audit-log", "delete"] },
}))

vi.mock("sonner", () => ({ toast: toastSpies }))

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { AUDIT_LOG_QUERY_KEYS } from "~/src/modules/audit-log/audit-log.constants"

import { useDeleteAuditLogs } from "~/src/presentation/components/custom/pages/admin/audit/hooks/use-delete-audit-logs"

const router = createTestRouter()

const renderDeleteHook = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <TestProviders queryClient={queryClient} router={router}>
      {children}
    </TestProviders>
  )

  return { invalidate, ...renderHook(() => useDeleteAuditLogs(), { wrapper }) }
}

describe("useDeleteAuditLogs", () => {
  beforeEach(() => {
    deleteAuditLogs.mockReset()
    toastSpies.error.mockReset()
    toastSpies.success.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it("sends the selected ids to the delete use case", async () => {
    deleteAuditLogs.mockResolvedValue({ deleted: 2, ok: true })
    const { result } = renderDeleteHook()

    result.current.mutate(["log_1", "log_2"])

    await waitFor(() => {
      expect(deleteAuditLogs).toHaveBeenCalledWith(["log_1", "log_2"], expect.anything())
    })
  })

  it("reports how many entries were deleted", async () => {
    deleteAuditLogs.mockResolvedValue({ deleted: 3, ok: true })
    const { result } = renderDeleteHook()

    result.current.mutate(["log_1"])

    await waitFor(() => {
      expect(toastSpies.success).toHaveBeenCalledWith("Entries deleted", { description: "Deleted 3 audit log entries." })
    })
    expect(toastSpies.error).not.toHaveBeenCalled()
  })

  it("shows an error toast when the deletion fails", async () => {
    deleteAuditLogs.mockRejectedValue(new Error("nope"))
    const { result } = renderDeleteHook()

    result.current.mutate(["log_1"])

    await waitFor(() => {
      expect(toastSpies.error).toHaveBeenCalledWith("Could not delete entries", { description: "Please try again in a moment." })
    })
    expect(toastSpies.success).not.toHaveBeenCalled()
  })

  it("invalidates the admin audit log queries once the deletion settles", async () => {
    deleteAuditLogs.mockResolvedValue({ deleted: 1, ok: true })
    const { invalidate, result } = renderDeleteHook()

    result.current.mutate(["log_1"])

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: AUDIT_LOG_QUERY_KEYS.ADMIN.ALL })
    })
  })

  it("invalidates the admin audit log queries even when the deletion fails", async () => {
    deleteAuditLogs.mockRejectedValue(new Error("nope"))
    const { invalidate, result } = renderDeleteHook()

    result.current.mutate(["log_1"])

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: AUDIT_LOG_QUERY_KEYS.ADMIN.ALL })
    })
  })
})
