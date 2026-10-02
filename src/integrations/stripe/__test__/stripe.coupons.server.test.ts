import type StripeType from "stripe"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { couponsCreate, couponsDel, couponsRetrieve } = vi.hoisted(() => ({
  couponsCreate: vi.fn<(params: object) => Promise<{ id: string }>>(),
  couponsDel: vi.fn<(couponId: string) => Promise<{ deleted: true; id: string }>>(),
  couponsRetrieve: vi.fn<(couponId: string) => Promise<Pick<StripeType.Coupon, "id" | "metadata">>>(),
}))

vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: { coupons: { create: couponsCreate, del: couponsDel, retrieve: couponsRetrieve } },
}))

import { deleteCheckoutCoupons, toSessionDiscounts } from "~/src/integrations/stripe/stripe.coupons.server"

const CHECKOUT_ID = "checkout-1"

const MARTE_TAG = { checkoutId: CHECKOUT_ID, source: "marte_checkout" }

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

beforeEach(() => {
  vi.clearAllMocks()
  couponsCreate.mockResolvedValue({ id: "coupon_1" })
  couponsDel.mockImplementation((couponId) => Promise.resolve({ deleted: true, id: couponId }))
  couponsRetrieve.mockImplementation((couponId) => Promise.resolve({ id: couponId, metadata: MARTE_TAG }))
})

describe("toSessionDiscounts", () => {
  it("mints a one-shot coupon worth exactly the applied discount, tagged with its checkout", async () => {
    await expect(
      toSessionDiscounts({
        checkoutId: CHECKOUT_ID,
        discount: { amountMinorUnits: 2000, code: "SPRING", discountId: "disc-1", type: "fixed_amount" },
      }),
    ).resolves.toStrictEqual([{ coupon: "coupon_1" }])
    expect(couponsCreate).toHaveBeenCalledExactlyOnceWith({
      amount_off: 2000,
      currency: "pln",
      duration: "once",
      metadata: MARTE_TAG,
      name: "SPRING",
    })
  })

  it("mints nothing when no discount applies", async () => {
    await expect(toSessionDiscounts({ checkoutId: CHECKOUT_ID, discount: undefined })).resolves.toStrictEqual([])
    expect(couponsCreate).not.toHaveBeenCalled()
  })
})

describe("deleteCheckoutCoupons", () => {
  it("deletes every coupon it minted for the checkout, by id or expanded object", async () => {
    await deleteCheckoutCoupons({
      checkoutId: CHECKOUT_ID,
      discounts: [{ coupon: "coupon_1" }, { coupon: { id: "coupon_expanded", metadata: MARTE_TAG } }],
    })

    expect(couponsRetrieve).toHaveBeenCalledExactlyOnceWith("coupon_1")
    expect(couponsDel).toHaveBeenCalledTimes(2)
    expect(couponsDel).toHaveBeenCalledWith("coupon_1")
    expect(couponsDel).toHaveBeenCalledWith("coupon_expanded")
  })

  it("leaves alone a coupon that MARTE did not mint", async () => {
    couponsRetrieve.mockResolvedValue({ id: "coupon_admin", metadata: {} })

    await deleteCheckoutCoupons({
      checkoutId: CHECKOUT_ID,
      discounts: [{ coupon: "coupon_admin" }, { coupon: { id: "coupon_untagged", metadata: null } }],
    })

    expect(couponsDel).not.toHaveBeenCalled()
  })

  it("leaves alone a coupon MARTE minted for another checkout", async () => {
    couponsRetrieve.mockResolvedValue({ id: "coupon_other", metadata: { checkoutId: "checkout-2", source: "marte_checkout" } })

    await deleteCheckoutCoupons({ checkoutId: CHECKOUT_ID, discounts: [{ coupon: "coupon_other" }] })

    expect(couponsDel).not.toHaveBeenCalled()
  })

  it("reads missing or null discounts, and a discount without a coupon, as no coupons", async () => {
    await deleteCheckoutCoupons({ checkoutId: CHECKOUT_ID, discounts: null })
    await deleteCheckoutCoupons({ checkoutId: CHECKOUT_ID, discounts: undefined })
    await deleteCheckoutCoupons({ checkoutId: CHECKOUT_ID, discounts: [{ coupon: null }, {}] })

    expect(couponsRetrieve).not.toHaveBeenCalled()
    expect(couponsDel).not.toHaveBeenCalled()
  })

  it("deletes nothing for a session that names no checkout", async () => {
    await deleteCheckoutCoupons({ checkoutId: undefined, discounts: [{ coupon: "coupon_1" }] })

    expect(couponsRetrieve).not.toHaveBeenCalled()
    expect(couponsDel).not.toHaveBeenCalled()
  })

  it("logs a coupon Stripe could not delete and still deletes the rest", async () => {
    couponsRetrieve.mockRejectedValueOnce(new Error("No such coupon: 'coupon_gone'"))

    await expect(
      deleteCheckoutCoupons({ checkoutId: CHECKOUT_ID, discounts: [{ coupon: "coupon_gone" }, { coupon: "coupon_2" }] }),
    ).resolves.toBeUndefined()
    expect(couponsDel).toHaveBeenCalledExactlyOnceWith("coupon_2")
    expect(consoleError).toHaveBeenCalledWith("Failed to delete Stripe coupon coupon_gone:", expect.any(Error))
  })
})
