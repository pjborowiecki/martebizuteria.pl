import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { COUPONS } from "~/src/data/coupons"

import { CouponListTable } from "~/src/presentation/components/custom/pages/admin/coupons/coupon-list-table"

const writeText = vi.fn<(text: string) => Promise<void>>()

const rowFor = (code: string): HTMLElement => {
  const row = screen.getByText(code).closest("tr")
  if (row === null) {
    throw new Error(`No row rendered for ${code}`)
  }

  return row
}

const copyButtonOf = (row: HTMLElement): HTMLElement => {
  const [button] = within(row).getAllByRole("button")
  if (button === undefined) {
    throw new Error("The row rendered no buttons")
  }

  return button
}

const headerRow = (): HTMLElement => {
  const [row] = screen.getAllByRole("row")
  if (row === undefined) {
    throw new Error("The table rendered no rows")
  }

  return row
}

beforeEach(() => {
  writeText.mockReset()
  writeText.mockResolvedValue()
  Object.defineProperty(globalThis.navigator, "clipboard", { configurable: true, value: { writeText } })
})

afterEach(() => {
  cleanup()
})

describe("CouponListTable rows", () => {
  it("renders one row per coupon", () => {
    renderWithProviders(<CouponListTable />)

    expect(screen.getAllByRole("row")).toHaveLength(COUPONS.length + 1)
  })

  it("shows every coupon code", () => {
    renderWithProviders(<CouponListTable />)

    for (const coupon of COUPONS) {
      expect(screen.getByText(coupon.code)).toBeInTheDocument()
    }
  })

  it("shows the discount, minimum order and usage of a coupon", () => {
    renderWithProviders(<CouponListTable />)
    const row = within(rowFor("WELCOME20"))

    expect(row.getByText("20%")).toBeInTheDocument()
    expect(row.getByText("$100")).toBeInTheDocument()
    expect(row.getByText("142 / 500")).toBeInTheDocument()
    expect(row.getByText("Percentage")).toBeInTheDocument()
  })

  it("translates each status into its badge label", () => {
    renderWithProviders(<CouponListTable />)

    expect(within(rowFor("WELCOME20")).getByText("Active")).toBeInTheDocument()
    expect(within(rowFor("HOLIDAY15")).getByText("Scheduled")).toBeInTheDocument()
    expect(within(rowFor("FLASH30")).getByText("Expired")).toBeInTheDocument()
  })

  it("tints an active badge green and an expired badge grey", () => {
    renderWithProviders(<CouponListTable />)

    expect(within(rowFor("WELCOME20")).getByText("Active")).toHaveClass("text-emerald-600")
    expect(within(rowFor("FLASH30")).getByText("Expired")).toHaveClass("text-muted-foreground")
  })

  it("shows a placeholder where a coupon has no minimum order", () => {
    renderWithProviders(<CouponListTable />)

    expect(within(rowFor("HOLIDAY15")).getByText("0 / ∞")).toBeInTheDocument()
  })

  it("copies the coupon code of the row whose copy button is pressed", async () => {
    renderWithProviders(<CouponListTable />)

    await userEvent.click(copyButtonOf(rowFor("VIP50")))

    expect(writeText).toHaveBeenCalledWith("VIP50")
  })
})

describe("CouponListTable chrome", () => {
  it("labels the search field for assistive technology", () => {
    renderWithProviders(<CouponListTable />)

    expect(screen.getByLabelText("Search coupons")).toBeInTheDocument()
  })

  it("translates the column headers", () => {
    renderWithProviders(<CouponListTable />)
    const header = within(headerRow())

    expect(header.getByText("Code")).toBeInTheDocument()
    expect(header.getByText("Min. Order")).toBeInTheDocument()
    expect(header.getByText("Expires")).toBeInTheDocument()
  })

  it("offers a select-all checkbox plus one per row", () => {
    renderWithProviders(<CouponListTable />)

    expect(screen.getByLabelText("Select all rows")).toBeInTheDocument()
    expect(screen.getAllByLabelText("Select row")).toHaveLength(COUPONS.length)
  })
})

it("opens the coupon action menu without bubbling the click beyond its row", () => {
  renderWithProviders(<CouponListTable />)
  const onDocumentClick = vi.fn<() => void>()
  document.addEventListener("click", onDocumentClick)

  try {
    fireEvent.click(within(rowFor("WELCOME20")).getByRole("button", { expanded: false }))

    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toStrictEqual([
      "Duplicate coupon",
      "View details",
      "Delete coupon",
    ])
    expect(onDocumentClick).not.toHaveBeenCalled()
  } finally {
    document.removeEventListener("click", onDocumentClick)
  }
})
