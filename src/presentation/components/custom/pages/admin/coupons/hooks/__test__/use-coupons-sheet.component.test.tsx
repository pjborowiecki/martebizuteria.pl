import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { buildCoupon } from "~/src/presentation/components/custom/pages/admin/coupons/__test__/coupon.fixture"
import { useCouponsSheetState } from "~/src/presentation/components/custom/pages/admin/coupons/hooks/use-coupons-sheet"

afterEach(cleanup)

describe("useCouponsSheetState", () => {
  it("starts closed with no coupon", () => {
    const { result } = renderHook(() => useCouponsSheetState())

    expect(result.current.open).toBe(false)
    expect(result.current.mode).toBe("closed")
    expect(result.current.coupon).toBeUndefined()
  })

  it("opens a blank sheet for a new coupon", () => {
    const { result } = renderHook(() => useCouponsSheetState())
    act(() => {
      result.current.openCreate()
    })

    expect(result.current.open).toBe(true)
    expect(result.current.mode).toBe("create")
    expect(result.current.coupon).toBeUndefined()
  })

  it("opens the sheet on the coupon being edited", () => {
    const coupon = buildCoupon()
    const { result } = renderHook(() => useCouponsSheetState())
    act(() => {
      result.current.openEdit(coupon)
    })

    expect(result.current.mode).toBe("edit")
    expect(result.current.coupon).toBe(coupon)
  })

  it("closes and forgets the coupon, and ignores a request to stay open", () => {
    const { result } = renderHook(() => useCouponsSheetState())
    act(() => {
      result.current.openEdit(buildCoupon())
    })
    act(() => {
      result.current.setOpen(true)
    })

    expect(result.current.open).toBe(true)

    act(() => {
      result.current.setOpen(false)
    })

    expect(result.current.open).toBe(false)
    expect(result.current.coupon).toBeUndefined()
  })
})
