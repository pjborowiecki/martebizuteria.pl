import { type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const calls = vi.hoisted(() => ({
  deleteDiscounts: vi.fn<(input: object) => Promise<{ deleted: number; ok: true }>>(),
  syncQueryInvalidation: vi.fn<(queryClient: object, queryKey: readonly string[]) => Promise<void>>(),
  toastError: vi.fn<(message: string, options: { description: string }) => void>(),
  toastSuccess: vi.fn<(message: string, options: { description: string }) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: calls.toastError, success: calls.toastSuccess } }))
vi.mock("~/src/integrations/tanstack-query/query.sync", () => ({ syncQueryInvalidation: calls.syncQueryInvalidation }))
vi.mock("~/src/modules/discount/use-cases/delete-discounts", async () => {
  const { DISCOUNT_MUTATION_KEYS } = await import("~/src/modules/discount/discount.constants")

  return { deleteDiscountsMutation: { mutationFn: calls.deleteDiscounts, mutationKey: DISCOUNT_MUTATION_KEYS.DELETE } }
})

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { DISCOUNT_QUERY_KEYS } from "~/src/modules/discount/discount.constants"

import { buildCoupon } from "~/src/presentation/components/custom/pages/admin/coupons/__test__/coupon.fixture"
import { useCouponActions } from "~/src/presentation/components/custom/pages/admin/coupons/use-coupon-actions"

const renderCouponActions = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <TestProviders queryClient={queryClient} router={createTestRouter()}>
      {children}
    </TestProviders>
  )

  return { queryClient, ...renderHook(() => useCouponActions(), { wrapper }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  calls.deleteDiscounts.mockResolvedValue({ deleted: 1, ok: true })
  calls.syncQueryInvalidation.mockResolvedValue(undefined)
})

afterEach(cleanup)

describe("useCouponActions opening the confirmation", () => {
  it("starts with the confirmation closed and nothing selected", () => {
    const { result } = renderCouponActions()

    expect(result.current.deleteOpen).toBe(false)
    expect(result.current.deleting).toBeUndefined()
    expect(result.current.isPending).toBe(false)
  })

  it("asks for confirmation before deleting a coupon", () => {
    const coupon = buildCoupon()
    const { result } = renderCouponActions()
    act(() => {
      result.current.handleRequestDelete(coupon)
    })

    expect(result.current.deleteOpen).toBe(true)
    expect(result.current.deleting).toBe(coupon)
    expect(calls.deleteDiscounts).not.toHaveBeenCalled()
  })
})

describe("useCouponActions deleting", () => {
  it("deletes the coupon awaiting confirmation, then closes the dialog and refreshes the coupon queries", async () => {
    const coupon = buildCoupon()
    const { queryClient, result } = renderCouponActions()
    act(() => {
      result.current.handleRequestDelete(coupon)
    })
    act(() => {
      result.current.handleConfirmDelete()
    })

    await waitFor(() => {
      expect(result.current.deleteOpen).toBe(false)
    })
    expect(calls.deleteDiscounts.mock.calls[0]?.[0]).toStrictEqual({ ids: [coupon.id] })
    expect(calls.toastSuccess).toHaveBeenCalledExactlyOnceWith("Coupon deleted", { description: "SPRING20 can no longer be redeemed." })
    expect(calls.syncQueryInvalidation).toHaveBeenCalledExactlyOnceWith(queryClient, DISCOUNT_QUERY_KEYS.ADMIN.ALL)
  })

  it("does nothing when a deletion is confirmed with no coupon awaiting it", () => {
    const { result } = renderCouponActions()
    act(() => {
      result.current.handleConfirmDelete()
    })

    expect(calls.deleteDiscounts).not.toHaveBeenCalled()
    expect(result.current.isPending).toBe(false)
    expect(calls.toastSuccess).not.toHaveBeenCalled()
  })

  it("keeps the confirmation open and reports the failure when a deletion fails", async () => {
    calls.deleteDiscounts.mockRejectedValue(new Error("database locked"))
    const { result } = renderCouponActions()
    act(() => {
      result.current.handleRequestDelete(buildCoupon())
    })
    act(() => {
      result.current.handleConfirmDelete()
    })

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledExactlyOnceWith("Could not save the coupon", {
        description: "Please try again in a moment.",
      })
    })
    expect(result.current.deleteOpen).toBe(true)
    expect(calls.syncQueryInvalidation).not.toHaveBeenCalled()
  })
})
