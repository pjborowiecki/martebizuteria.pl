import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type Discount } from "~/src/modules/discount/discount.types"

const { createDiscount, deleteDiscounts, getAdminDiscountsPage, updateDiscount } = vi.hoisted(() => ({
  createDiscount: vi.fn<(input: object) => Promise<{ code: string; ok: true }>>(),
  deleteDiscounts: vi.fn<(input: object) => Promise<{ deleted: number; ok: true }>>(),
  getAdminDiscountsPage: vi.fn<(input: { search?: string }) => Promise<{ items: Discount["adminListItem"][] }>>(),
  updateDiscount: vi.fn<(input: object) => Promise<{ code: string; ok: true }>>(),
}))

vi.mock("~/src/modules/discount/use-cases/get-admin-discounts-page", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getAdminDiscountsPageQuery: (input: { search?: string }) =>
      queryOptions({ queryFn: () => getAdminDiscountsPage(input), queryKey: ["admin", "discounts", "page", input] }),
  }
})
vi.mock("~/src/modules/discount/use-cases/create-discount", () => ({
  createDiscountMutation: { mutationFn: createDiscount, mutationKey: ["discount", "create"] },
}))
vi.mock("~/src/modules/discount/use-cases/update-discount", () => ({
  updateDiscountMutation: { mutationFn: updateDiscount, mutationKey: ["discount", "update"] },
}))
vi.mock("~/src/modules/discount/use-cases/delete-discounts", () => ({
  deleteDiscountsMutation: { mutationFn: deleteDiscounts, mutationKey: ["discount", "delete"] },
}))
vi.mock("~/src/integrations/tanstack-query/query.sync", () => ({ syncQueryInvalidation: () => Promise.resolve(undefined) }))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { buildCoupon } from "~/src/presentation/components/custom/pages/admin/coupons/__test__/coupon.fixture"
import { CouponListTable } from "~/src/presentation/components/custom/pages/admin/coupons/coupon-list-table"

beforeEach(() => {
  vi.clearAllMocks()
  getAdminDiscountsPage.mockResolvedValue({ items: [buildCoupon()] })
  createDiscount.mockResolvedValue({ code: "NEW10", ok: true })
  updateDiscount.mockResolvedValue({ code: "SPRING20", ok: true })
  deleteDiscounts.mockResolvedValue({ deleted: 1, ok: true })
})

afterEach(cleanup)

describe("CouponListTable", () => {
  it("lists a coupon with its code, type and discount", async () => {
    renderWithProviders(<CouponListTable />)

    expect(await screen.findByText("SPRING20")).toBeInTheDocument()
    expect(screen.getByText("Spring campaign")).toBeInTheDocument()
    expect(screen.getByText("Percentage")).toBeInTheDocument()
    expect(screen.getByText("20%")).toBeInTheDocument()
  })

  it("shows how far through its allowance a coupon is", async () => {
    renderWithProviders(<CouponListTable />)

    expect(await screen.findByText("12 / 100")).toBeInTheDocument()
  })

  it("says how many times an unlimited coupon has been used", async () => {
    getAdminDiscountsPage.mockResolvedValue({ items: [buildCoupon({ usageLimit: undefined })] })
    renderWithProviders(<CouponListTable />)

    expect(await screen.findByText("12 used")).toBeInTheDocument()
  })

  it("badges the coupon status", async () => {
    getAdminDiscountsPage.mockResolvedValue({ items: [buildCoupon({ status: "expired" })] })
    renderWithProviders(<CouponListTable />)

    expect(await screen.findByText("Expired")).toBeInTheDocument()
  })

  it("leaves the discount column blank for a free shipping coupon", async () => {
    getAdminDiscountsPage.mockResolvedValue({ items: [buildCoupon({ type: "free_shipping", value: 0 })] })
    renderWithProviders(<CouponListTable />)

    expect(await screen.findByText("Free shipping")).toBeInTheDocument()
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })

  it("invites the first coupon when the store has none", async () => {
    getAdminDiscountsPage.mockResolvedValue({ items: [] })
    renderWithProviders(<CouponListTable />)

    expect(await screen.findByText("No coupons yet")).toBeInTheDocument()
  })

  it("passes the search term to the query", async () => {
    renderWithProviders(<CouponListTable />)
    await screen.findByText("SPRING20")

    fireEvent.change(screen.getByLabelText("Search codes"), { target: { value: "spring" } })

    expect(getAdminDiscountsPage).toHaveBeenCalledWith({ search: "spring" })
  })

  it("opens an empty form for a new coupon", async () => {
    renderWithProviders(<CouponListTable />)
    await screen.findByText("SPRING20")

    fireEvent.click(screen.getByRole("button", { name: "Create coupon" }))

    expect(await screen.findByRole("heading", { name: "Create coupon" })).toBeInTheDocument()
    expect(screen.getByLabelText("Code")).toHaveValue("")
  })

  it("opens the form filled in when editing an existing coupon", async () => {
    renderWithProviders(<CouponListTable />)
    fireEvent.click(await screen.findByRole("button", { name: "Actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit coupon" }))

    expect(await screen.findByRole("heading", { name: "Edit coupon" })).toBeInTheDocument()
    expect(screen.getByLabelText("Code")).toHaveValue("SPRING20")
  })

  it("confirms before deleting and names the code at risk", async () => {
    renderWithProviders(<CouponListTable />)
    fireEvent.click(await screen.findByRole("button", { name: "Actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete coupon" }))

    expect(await screen.findByRole("heading", { name: "Delete this coupon?" })).toBeInTheDocument()
    expect(screen.getByText(/SPRING20 will stop working/u)).toBeInTheDocument()
  })

  it("deletes the coupon once the deletion is confirmed", async () => {
    renderWithProviders(<CouponListTable />)
    fireEvent.click(await screen.findByRole("button", { name: "Actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete coupon" }))
    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(await within(dialog).findByRole("button", { name: "Delete coupon" }))

    await waitFor(() => {
      expect(deleteDiscounts).toHaveBeenCalledOnce()
    })
    expect(deleteDiscounts.mock.calls[0]?.[0]).toStrictEqual({ ids: ["a1b2c3d4-0000-0000-0000-000000000001"] })
  })
})
