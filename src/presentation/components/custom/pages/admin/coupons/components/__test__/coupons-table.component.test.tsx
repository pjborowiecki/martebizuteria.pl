import { type JSX, Suspense } from "react"

import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type Discount } from "~/src/modules/discount/discount.types"

const calls = vi.hoisted(() => ({
  createDiscount: vi.fn<(input: object) => Promise<{ code: string; ok: true }>>(),
  deleteDiscounts: vi.fn<(input: { ids: string[] }) => Promise<{ deleted: number; ok: true }>>(),
  page: vi.fn<(input: Record<string, unknown>) => Promise<CouponsPage>>(),
  stats: vi.fn<() => Promise<Discount["adminStats"]>>(),
  syncQueryInvalidation: vi.fn<(queryClient: object, queryKey: readonly string[]) => Promise<void>>(),
  toastError: vi.fn<(message: string, options?: { description: string }) => void>(),
  toastSuccess: vi.fn<(message: string, options?: { description: string }) => void>(),
  updateDiscount: vi.fn<(input: object) => Promise<{ code: string; ok: true }>>(),
  writeText: vi.fn<(text: string) => Promise<void>>(),
}))

interface CouponsPage {
  readonly hasMore: boolean
  readonly items: Discount["adminListItem"][]
  readonly limit: number
  readonly offset: number
  readonly total: number
}

vi.mock("sonner", () => ({ toast: { error: calls.toastError, success: calls.toastSuccess } }))
vi.mock("~/src/integrations/tanstack-query/query.sync", () => ({ syncQueryInvalidation: calls.syncQueryInvalidation }))
vi.mock("~/src/modules/discount/use-cases/get-admin-discounts-page", async () => {
  const { queryOptions } = await import("@tanstack/react-query")
  const { DISCOUNT_QUERY_KEYS } = await import("~/src/modules/discount/discount.constants")

  return {
    getAdminDiscountsPageQuery: (input: Record<string, unknown>) =>
      queryOptions({ queryFn: () => calls.page(input), queryKey: [...DISCOUNT_QUERY_KEYS.ADMIN.PAGE, input] }),
  }
})
vi.mock("~/src/modules/discount/use-cases/get-admin-discount-stats", async () => {
  const { queryOptions } = await import("@tanstack/react-query")
  const { DISCOUNT_QUERY_KEYS } = await import("~/src/modules/discount/discount.constants")

  return { getDiscountStatsQuery: () => queryOptions({ queryFn: () => calls.stats(), queryKey: DISCOUNT_QUERY_KEYS.ADMIN.STATS }) }
})
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

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DISCOUNT_QUERY_KEYS, DISCOUNT_STATUS, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"

import { buildCoupon, buildStats } from "~/src/presentation/components/custom/pages/admin/coupons/__test__/coupon.fixture"
import { CouponsTableContent } from "~/src/presentation/components/custom/pages/admin/coupons/components/coupons-table"
import {
  CouponsSheetProvider,
  useCouponsSheetState,
} from "~/src/presentation/components/custom/pages/admin/coupons/hooks/use-coupons-sheet"

const pageOf = (items: Discount["adminListItem"][], total = items.length): CouponsPage => ({
  hasMore: false,
  items,
  limit: 25,
  offset: 0,
  total,
})

const CouponsPageHarness = (): JSX.Element => {
  const sheet = useCouponsSheetState()

  return (
    <CouponsSheetProvider value={sheet}>
      <Suspense fallback={<p>loading coupons</p>}>
        <CouponsTableContent />
      </Suspense>
    </CouponsSheetProvider>
  )
}

const renderCoupons = () => renderWithProviders(<CouponsPageHarness />)

const rowOf = async (code: string): Promise<HTMLElement> => {
  const codeText = await screen.findByText(code)
  const row = codeText.closest("tr")
  if (row === null) {
    throw new Error(`no table row lists ${code}`)
  }

  return row
}

const cellUnder = async (code: string, column: string): Promise<HTMLElement | undefined> => {
  const row = await rowOf(code)
  const columns = screen.getAllByRole("columnheader").map((header) => header.textContent)

  return within(row).getAllByRole("cell")[columns.indexOf(column)]
}

const choose = async (select: string, option: string) => {
  await userEvent.click(screen.getByRole("combobox", { name: select }))
  const options = await screen.findAllByRole("option")
  const match = options.find((candidate) => candidate.textContent === option)
  if (match === undefined) {
    throw new Error(`${select} offered no ${option} option`)
  }

  await userEvent.click(match)
}

const lastPageInput = () => calls.page.mock.calls.at(-1)?.[0]

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  calls.page.mockResolvedValue(pageOf([buildCoupon()]))
  calls.stats.mockResolvedValue(buildStats())
  calls.deleteDiscounts.mockResolvedValue({ deleted: 1, ok: true })
  calls.syncQueryInvalidation.mockResolvedValue(undefined)
  calls.writeText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: calls.writeText } })
})

afterEach(() => {
  cleanup()
  document.body.style.pointerEvents = ""
})

describe("CouponsTableContent rows", () => {
  it("lists a coupon with its code, note, status, type and discount", async () => {
    renderCoupons()

    const row = await rowOf("SPRING20")

    expect(within(row).getByText("Spring campaign")).toBeInTheDocument()
    expect(within(row).getByText("Active")).toBeInTheDocument()
    expect(within(row).getByText("Percentage")).toBeInTheDocument()
    expect(within(row).getByText("20%")).toBeInTheDocument()
    expect(within(row).getByText("12 / 100")).toBeInTheDocument()
  })

  it("prices a fixed amount coupon and its minimum basket value in złoty and dates its expiry and creation", async () => {
    calls.page.mockResolvedValue(pageOf([buildCoupon({ type: DISCOUNT_TYPE.FIXED_AMOUNT, value: 1500 })]))
    renderCoupons()

    expect(await cellUnder("SPRING20", "Discount")).toHaveTextContent("PLN 15.00")
    expect(await cellUnder("SPRING20", "Min. basket value")).toHaveTextContent("PLN 200.00")
    expect(await cellUnder("SPRING20", "Expires")).toHaveTextContent("Jul 1, 2026")
    expect(await cellUnder("SPRING20", "Created")).toHaveTextContent("Mar 1, 2026")
  })

  it("leaves the blanks of an open-ended free shipping coupon empty and counts its unlimited uses", async () => {
    calls.page.mockResolvedValue(
      pageOf([
        buildCoupon({
          description: undefined,
          endsAt: undefined,
          minOrderTotalMinorUnits: undefined,
          status: DISCOUNT_STATUS.EXPIRED,
          type: DISCOUNT_TYPE.FREE_SHIPPING,
          usageLimit: undefined,
          value: 0,
        }),
      ]),
    )
    renderCoupons()

    expect(await cellUnder("SPRING20", "Discount")).toHaveTextContent("—")
    expect(await cellUnder("SPRING20", "Min. basket value")).toHaveTextContent("—")
    expect(await cellUnder("SPRING20", "Expires")).toHaveTextContent("—")
    expect(await cellUnder("SPRING20", "Usage")).toHaveTextContent("12 used")
    expect(await cellUnder("SPRING20", "Status")).toHaveTextContent("Expired")
  })

  it("keeps the ID and start columns out of the way until they are asked for", async () => {
    renderCoupons()
    await rowOf("SPRING20")

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent)

    expect(headers).not.toContain("ID")
    expect(headers).not.toContain("Starts")
  })

  it("shows the ID and start columns once they are switched on", async () => {
    const scheduled = buildCoupon({ startsAt: new Date("2026-02-01T10:00:00.000Z") })
    calls.page.mockResolvedValue(pageOf([scheduled]))
    renderCoupons()
    await rowOf("SPRING20")

    await userEvent.click(screen.getByRole("button", { name: "Show or hide columns" }))
    await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "ID" }))
    await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Starts" }))

    expect(await cellUnder("SPRING20", "ID")).toHaveTextContent("a1b2c3d4-0000-0000-0000-000000000001")
    expect(await cellUnder("SPRING20", "Starts")).toHaveTextContent("Feb 1, 2026")
  })

  it("says there is nothing to show when no coupon matches", async () => {
    calls.page.mockResolvedValue(pageOf([]))
    renderCoupons()

    expect(await screen.findByText("No data to display")).toBeInTheDocument()
  })
})

describe("CouponsTableContent stats", () => {
  it("counts the coupons, redemptions and money given away", async () => {
    renderCoupons()

    expect(await screen.findByText("PLN 1,245.00")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Total coupons/u })).toHaveTextContent("7")
    expect(screen.getByRole("button", { name: /Active coupons/u })).toHaveTextContent("3")
    expect(screen.getByText("Redemptions").closest("[data-slot='card']")).toHaveTextContent("42")
  })

  it("narrows the list to active coupons from their card and widens it again from the total", async () => {
    renderCoupons()
    await rowOf("SPRING20")

    expect(screen.getByRole("button", { name: /Total coupons/u })).toHaveAttribute("aria-pressed", "true")

    fireEvent.click(screen.getByRole("button", { name: /Active coupons/u }))

    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ page: 1, status: DISCOUNT_STATUS.ACTIVE })
    })
    expect(screen.getByRole("button", { name: /Active coupons/u })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("combobox", { name: "Filter by status" })).toHaveTextContent("Active")

    fireEvent.click(screen.getByRole("button", { name: /Active coupons/u }))

    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ status: undefined })
    })

    fireEvent.click(screen.getByRole("button", { name: /Active coupons/u }))
    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ status: DISCOUNT_STATUS.ACTIVE })
    })
    fireEvent.click(screen.getByRole("button", { name: /Total coupons/u }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Total coupons/u })).toHaveAttribute("aria-pressed", "true")
    })
  })
})

describe("CouponsTableContent while reloading", () => {
  it("holds the stat cards still until fresh numbers arrive", async () => {
    renderCoupons()
    await rowOf("SPRING20")
    calls.stats.mockReturnValue(new Promise(() => {}))

    fireEvent.click(screen.getByRole("button", { name: "Reload table data" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Active coupons/u })).toBeDisabled()
    })
    expect(screen.getByRole("button", { name: /Active coupons/u })).toHaveAttribute("aria-busy", "true")
    expect(screen.queryByText("PLN 1,245.00")).not.toBeInTheDocument()
  })
})

describe("CouponsTableContent toolbar", () => {
  it("asks the server for the typed search", async () => {
    renderCoupons()
    await rowOf("SPRING20")

    fireEvent.change(screen.getByLabelText("Search by code or description..."), { target: { value: "spring" } })

    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ page: 1, search: "spring" })
    })
  })

  it("asks the server for one status and one type at a time and for everything again", async () => {
    renderCoupons()
    await rowOf("SPRING20")

    await choose("Filter by status", "Scheduled")
    await choose("Filter by type", "Free shipping")

    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ status: DISCOUNT_STATUS.SCHEDULED, type: DISCOUNT_TYPE.FREE_SHIPPING })
    })

    await choose("Filter by status", "All statuses")
    await choose("Filter by type", "All types")

    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ status: undefined, type: undefined })
    })
  })

  it("pages through coupons on the server", async () => {
    calls.page.mockResolvedValue(pageOf([buildCoupon()], 60))
    renderCoupons()
    await rowOf("SPRING20")

    fireEvent.click(screen.getByRole("button", { name: "Next page" }))

    await waitFor(() => {
      expect(lastPageInput()).toMatchObject({ page: 2, pageSize: 25 })
    })
  })

  it("reloads the coupon list and stats on request", async () => {
    renderCoupons()
    await rowOf("SPRING20")
    const pageReads = calls.page.mock.calls.length

    fireEvent.click(screen.getByRole("button", { name: "Reload table data" }))

    await waitFor(() => {
      expect(calls.page.mock.calls.length).toBeGreaterThan(pageReads)
    })
    expect(calls.stats).toHaveBeenCalledTimes(2)
  })
})

describe("CouponsTableContent editing", () => {
  it("opens an empty sheet for a new coupon", async () => {
    renderCoupons()
    await rowOf("SPRING20")

    fireEvent.click(screen.getByRole("button", { name: "Create coupon" }))

    expect(await screen.findByRole("heading", { name: "Create coupon" })).toBeInTheDocument()
    expect(screen.getByLabelText("Code")).toHaveValue("")
  })

  it("opens the sheet on a coupon when its row is clicked and closes it on cancel", async () => {
    renderCoupons()
    fireEvent.click(await rowOf("SPRING20"))

    expect(await screen.findByRole("heading", { name: "Edit coupon" })).toBeInTheDocument()
    expect(screen.getByLabelText("Code")).toHaveValue("SPRING20")

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Edit coupon" })).not.toBeInTheDocument()
    })
  })

  it("opens the sheet on a coupon from its row menu", async () => {
    renderCoupons()
    fireEvent.click(within(await rowOf("SPRING20")).getByRole("button", { name: "Actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit coupon" }))

    expect(await screen.findByRole("heading", { name: "Edit coupon" })).toBeInTheDocument()
  })

  it("copies the code and the ID from the row menu", async () => {
    renderCoupons()
    const row = await rowOf("SPRING20")
    fireEvent.click(within(row).getByRole("button", { name: "Actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy code" }))
    fireEvent.click(within(row).getByRole("button", { name: "Actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy ID" }))

    expect(calls.writeText.mock.calls).toStrictEqual([["SPRING20"], ["a1b2c3d4-0000-0000-0000-000000000001"]])
    expect(calls.toastSuccess.mock.calls).toStrictEqual([["Code copied to clipboard"], ["Coupon ID copied to clipboard"]])
  })
})

describe("CouponsTableContent deleting", () => {
  it("confirms before deleting one coupon and names it once it is gone", async () => {
    const { queryClient } = renderCoupons()
    fireEvent.click(within(await rowOf("SPRING20")).getByRole("button", { name: "Actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete coupon" }))
    const dialog = await screen.findByRole("alertdialog")

    expect(within(dialog).getByText(/SPRING20 will stop working/u)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: "Delete coupon" }))

    await waitFor(() => {
      expect(calls.toastSuccess).toHaveBeenCalledExactlyOnceWith("Coupon deleted", { description: "SPRING20 can no longer be redeemed." })
    })
    expect(calls.deleteDiscounts.mock.calls[0]?.[0]).toStrictEqual({ ids: ["a1b2c3d4-0000-0000-0000-000000000001"] })
    expect(calls.syncQueryInvalidation).toHaveBeenCalledExactlyOnceWith(queryClient, DISCOUNT_QUERY_KEYS.ADMIN.ALL)
  })

  it("says the coupon could not be deleted and keeps the confirmation open", async () => {
    calls.deleteDiscounts.mockRejectedValue(new Error("database locked"))
    renderCoupons()
    fireEvent.click(within(await rowOf("SPRING20")).getByRole("button", { name: "Actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete coupon" }))
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete coupon" }))

    await waitFor(() => {
      expect(calls.toastError).toHaveBeenCalledExactlyOnceWith("Couldn't delete", {
        description: "The selected codes could not be deleted. Please try again.",
      })
    })
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    expect(calls.syncQueryInvalidation).not.toHaveBeenCalled()
  })

  it("locks the bulk confirmation while the coupons are being deleted", async () => {
    calls.deleteDiscounts.mockReturnValue(new Promise(() => {}))
    renderCoupons()
    await rowOf("SPRING20")
    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete (1)" }))
    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(within(dialog).getByRole("button", { name: "Delete" })).toBeDisabled()
    })
    expect(within(dialog).getByRole("button", { name: "Delete" }).querySelector("svg")).not.toBeNull()
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled()
  })

  it("deletes every selected coupon at once after a confirmation", async () => {
    calls.page.mockResolvedValue(pageOf([buildCoupon(), buildCoupon({ code: "WINTER10", id: "a1b2c3d4-0000-0000-0000-000000000002" })]))
    calls.deleteDiscounts.mockResolvedValue({ deleted: 2, ok: true })
    renderCoupons()
    await rowOf("WINTER10")

    expect(screen.queryByText("2 selected")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("checkbox", { name: "Select all rows" }))

    expect(screen.getByText("2 selected")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Delete (2)" }))
    const dialog = await screen.findByRole("alertdialog")

    expect(within(dialog).getByText(/2 code\(s\) will stop working/u)).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(calls.toastSuccess).toHaveBeenCalledExactlyOnceWith("Coupons deleted", { description: "Deleted 2 code(s)." })
    })
    expect(calls.deleteDiscounts.mock.calls[0]?.[0]).toStrictEqual({
      ids: ["a1b2c3d4-0000-0000-0000-000000000001", "a1b2c3d4-0000-0000-0000-000000000002"],
    })
    await waitFor(() => {
      expect(screen.queryByText("2 selected")).not.toBeInTheDocument()
    })
  })
})
