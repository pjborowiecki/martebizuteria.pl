import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AUDIT_LOG_QUERY_KEYS } from "~/src/modules/audit-log/audit-log.constants"

import { AuditRefreshAction } from "~/src/presentation/components/custom/pages/admin/audit/components/audit-refresh-action"

const REFRESH_LABEL = "Refresh table data"

const renderRefreshAction = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return {
    invalidateQueries: vi.spyOn(queryClient, "invalidateQueries"),
    ...renderWithProviders(<AuditRefreshAction />, { queryClient }),
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("AuditRefreshAction", () => {
  it("labels the control from the audit toolbar messages", () => {
    renderRefreshAction()

    expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeInTheDocument()
  })

  it("is ready to use while nothing is in flight", () => {
    renderRefreshAction()
    const button = screen.getByRole("button", { name: REFRESH_LABEL })

    expect(button).toBeEnabled()
    expect(button).toHaveAttribute("aria-busy", "false")
  })

  it("refetches every audit query when pressed, not just the mounted ones", () => {
    const { invalidateQueries } = renderRefreshAction()
    fireEvent.click(screen.getByRole("button", { name: REFRESH_LABEL }))

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: AUDIT_LOG_QUERY_KEYS.ADMIN.ALL, refetchType: "all" })
  })

  it("invalidates again on a second press rather than going inert", () => {
    const { invalidateQueries } = renderRefreshAction()
    const button = screen.getByRole("button", { name: REFRESH_LABEL })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(invalidateQueries).toHaveBeenCalledTimes(2)
  })
})

it("prevents duplicate refreshes while audit data is loading and becomes available on completion", async () => {
  const deferred = Promise.withResolvers<string>()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const pending = queryClient.query({ queryFn: () => deferred.promise, queryKey: [...AUDIT_LOG_QUERY_KEYS.ADMIN.ALL, "pending"] })
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  renderWithProviders(<AuditRefreshAction />, { queryClient })
  const button = screen.getByRole("button", { name: REFRESH_LABEL })

  expect(button).toBeDisabled()
  expect(button).toHaveAttribute("aria-busy", "true")
  expect(button.querySelector("svg")).toHaveClass("animate-spin")
  fireEvent.click(button)
  expect(invalidate).not.toHaveBeenCalled()

  await act(async () => {
    deferred.resolve("loaded")
    await pending
  })
  await waitFor(() => {
    expect(button).toBeEnabled()
  })
  expect(button).toHaveAttribute("aria-busy", "false")
  expect(button.querySelector("svg")).not.toHaveClass("animate-spin")
})
