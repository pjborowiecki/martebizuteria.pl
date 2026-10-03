import { type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const calls = vi.hoisted(() => ({
  createDiscount: vi.fn<(input: object) => Promise<{ code: string; ok: true }>>(),
  deleteDiscounts: vi.fn<(input: object) => Promise<{ deleted: number; ok: true }>>(),
  syncQueryInvalidation: vi.fn<(queryClient: object, queryKey: readonly string[]) => Promise<void>>(),
  toastError: vi.fn<(message: string, options: { description: string }) => void>(),
  toastSuccess: vi.fn<(message: string, options: { description: string }) => void>(),
  updateDiscount: vi.fn<(input: object) => Promise<{ code: string; ok: true }>>(),
}))

vi.mock("sonner", () => ({ toast: { error: calls.toastError, success: calls.toastSuccess } }))
vi.mock("~/src/integrations/tanstack-query/query.sync", () => ({ syncQueryInvalidation: calls.syncQueryInvalidation }))
vi.mock("~/src/modules/discount/use-cases/create-discount", async () => {
  const { DISCOUNT_MUTATION_KEYS } = await import("~/src/modules/discount/discount.constants")

  return { createDiscountMutation: { mutationFn: calls.createDiscount, mutationKey: DISCOUNT_MUTATION_KEYS.CREATE } }
})
vi.mock("~/src/modules/discount/use-cases/update-discount", async () => {
  const { DISCOUNT_MUTATION_KEYS } = await import("~/src/modules/discount/discount.constants")

  return { updateDiscountMutation: { mutationFn: calls.updateDiscount, mutationKey: DISCOUNT_MUTATION_KEYS.UPDATE } }
})
vi.mock("~/src/modules/discount/use-cases/delete-discounts", async () => {
  const { DISCOUNT_MUTATION_KEYS } = await import("~/src/modules/discount/discount.constants")

  return { deleteDiscountsMutation: { mutationFn: calls.deleteDiscounts, mutationKey: DISCOUNT_MUTATION_KEYS.DELETE } }
})

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DISCOUNT_ERROR_CODES, DISCOUNT_QUERY_KEYS, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"

import { buildCoupon } from "~/src/presentation/components/custom/pages/admin/coupons/__test__/coupon.fixture"
import { useCouponActions } from "~/src/presentation/components/custom/pages/admin/coupons/use-coupon-actions"

const FORM_VALUES: Discount["adminFormValues"] = {
  code: "NEW10",
  isActive: true,
  type: DISCOUNT_TYPE.PERCENTAGE,
  value: 10,
}

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
  calls.createDiscount.mockResolvedValue({ code: "NEW10", ok: true })
  calls.updateDiscount.mockResolvedValue({ code: "SPRING20", ok: true })
  calls.deleteDiscounts.mockResolvedValue({ deleted: 1, ok: true })
  calls.syncQueryInvalidation.mockResolvedValue(undefined)
})

afterEach(cleanup)

describe("useCouponActions opening the dialogs", () => {
  it("starts with both dialogs closed and nothing selected", () => {
    const { result } = renderCouponActions()

    expect(result.current.formOpen).toBe(false)
    expect(result.current.deleteOpen).toBe(false)
    expect(result.current.editing).toBeUndefined()
    expect(result.current.deleting).toBeUndefined()
    expect(result.current.isPending).toBe(false)
  })

  it("opens a blank form for a new coupon even after an edit", () => {
    const { result } = renderCouponActions()
    act(() => {
      result.current.handleEdit(buildCoupon())
    })
    act(() => {
      result.current.handleCreate()
    })

    expect(result.current.formOpen).toBe(true)
    expect(result.current.editing).toBeUndefined()
  })

  it("opens the form on the coupon being edited", () => {
    const coupon = buildCoupon()
    const { result } = renderCouponActions()
    act(() => {
      result.current.handleEdit(coupon)
    })

    expect(result.current.formOpen).toBe(true)
    expect(result.current.editing).toBe(coupon)
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

describe("useCouponActions saving", () => {
  it("creates a coupon when nothing is being edited, then closes the form and refreshes the coupon queries", async () => {
    const { queryClient, result } = renderCouponActions()
    act(() => {
      result.current.handleCreate()
    })
    act(() => {
      result.current.handleSubmit(FORM_VALUES)
    })

    await waitFor(() => {
      expect(result.current.formOpen).toBe(false)
    })
    expect(calls.createDiscount.mock.calls[0]?.[0]).toStrictEqual({ values: FORM_VALUES })
    expect(calls.updateDiscount).not.toHaveBeenCalled()
    expect(calls.toastSuccess).toHaveBeenCalledExactlyOnceWith("Coupon created", { description: "NEW10 can be used at checkout now." })
    expect(calls.syncQueryInvalidation).toHaveBeenCalledExactlyOnceWith(queryClient, DISCOUNT_QUERY_KEYS.ADMIN.ALL)
  })

  it("updates the coupon being edited under its id, then closes the form and refreshes the coupon queries", async () => {
    const coupon = buildCoupon()
    const { queryClient, result } = renderCouponActions()
    act(() => {
      result.current.handleEdit(coupon)
    })
    act(() => {
      result.current.handleSubmit(FORM_VALUES)
    })

    await waitFor(() => {
      expect(result.current.formOpen).toBe(false)
    })
    expect(calls.updateDiscount.mock.calls[0]?.[0]).toStrictEqual({ id: coupon.id, values: FORM_VALUES })
    expect(calls.createDiscount).not.toHaveBeenCalled()
    expect(calls.toastSuccess).toHaveBeenCalledExactlyOnceWith("Coupon updated", { description: "SPRING20 has been saved." })
    expect(calls.syncQueryInvalidation).toHaveBeenCalledExactlyOnceWith(queryClient, DISCOUNT_QUERY_KEYS.ADMIN.ALL)
  })

  it("reports pending while a save is in flight", async () => {
    const pending = Promise.withResolvers<{ code: string; ok: true }>()
    calls.createDiscount.mockReturnValue(pending.promise)
    const { result } = renderCouponActions()
    act(() => {
      result.current.handleSubmit(FORM_VALUES)
    })

    await waitFor(() => {
      expect(result.current.isPending).toBe(true)
    })

    pending.resolve({ code: "NEW10", ok: true })

    await waitFor(() => {
      expect(result.current.isPending).toBe(false)
    })
  })

  it("says the code is taken when the server reports a conflict and keeps the form open", async () => {
    calls.createDiscount.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT, DISCOUNT_ERROR_CODES.CODE_TAKEN))
    const { result } = renderCouponActions()
    act(() => {
      result.current.handleCreate()
    })
    act(() => {
      result.current.handleSubmit(FORM_VALUES)
    })

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledExactlyOnceWith("Could not save the coupon", { description: "That code is already in use." })
    })
    expect(result.current.formOpen).toBe(true)
    expect(calls.toastSuccess).not.toHaveBeenCalled()
    expect(calls.syncQueryInvalidation).not.toHaveBeenCalled()
  })

  it("asks to try again when an update fails for any other reason", async () => {
    calls.updateDiscount.mockRejectedValue(new Error("network down"))
    const { result } = renderCouponActions()
    act(() => {
      result.current.handleEdit(buildCoupon())
    })
    act(() => {
      result.current.handleSubmit(FORM_VALUES)
    })

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledExactlyOnceWith("Could not save the coupon", {
        description: "Please try again in a moment.",
      })
    })
    expect(result.current.formOpen).toBe(true)
    expect(calls.syncQueryInvalidation).not.toHaveBeenCalled()
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
