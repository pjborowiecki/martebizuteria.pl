import { type JSX } from "react"

import { cleanup, fireEvent, screen } from "@testing-library/react"
import { useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ADMIN_CUSTOMER_STAT_FILTER, type AdminCustomerStatFilter } from "~/src/modules/user/user.constants"

import {
  CustomerStatCard,
  buildCustomerStatCaption,
  formatCustomerStatDisplayValue,
} from "~/src/presentation/components/custom/pages/admin/customers/components/customer-stat-card"
import {
  CUSTOMER_STAT_CARDS,
  type CustomerStatCardConfig,
  type CustomerStatKey,
} from "~/src/presentation/components/custom/pages/admin/customers/customers-stats.config"

const LOCALE = "en-US"

const configFor = (key: CustomerStatKey): CustomerStatCardConfig => {
  const config = CUSTOMER_STAT_CARDS.find((card) => card.key === key)
  if (config === undefined) {
    throw new Error(`No stat card configured for ${key}`)
  }

  return config
}

const createFilterSpy = () => vi.fn<(filter?: AdminCustomerStatFilter) => void>()

const CaptionProbe = ({ statKey }: Readonly<{ statKey: CustomerStatKey }>): JSX.Element => {
  const t = useTranslations("pages.admin.customers")

  return <span>{buildCustomerStatCaption({ key: statKey, t }) ?? "no caption"}</span>
}

afterEach(() => {
  cleanup()
})

describe("formatCustomerStatDisplayValue", () => {
  it("renders the average lifetime value as store money", () => {
    expect(formatCustomerStatDisplayValue("averageLtv", 19_900, "pl-PL")).toContain("199,00")
  })

  it("always shows one decimal for the average units per order", () => {
    expect(formatCustomerStatDisplayValue("averageProductsPerOrder", 2, LOCALE)).toBe("2.0")
    expect(formatCustomerStatDisplayValue("averageProductsPerOrder", 2.46, LOCALE)).toBe("2.5")
  })

  it("renders the returning share as a percentage", () => {
    expect(formatCustomerStatDisplayValue("returningRate", 38, LOCALE)).toBe("38%")
  })

  it("groups the customer count for the locale", () => {
    expect(formatCustomerStatDisplayValue("total", 12_345, LOCALE)).toBe("12,345")
    expect(formatCustomerStatDisplayValue("total", 12_345, "pl-PL")).not.toBe("12,345")
  })
})

describe("buildCustomerStatCaption", () => {
  it("explains what the average lifetime value is measured over", () => {
    renderWithProviders(<CaptionProbe statKey="averageLtv" />)

    expect(screen.getByText("Customers with at least one order")).toBeInTheDocument()
  })

  it("explains what counts as a returning customer", () => {
    renderWithProviders(<CaptionProbe statKey="returningRate" />)

    expect(screen.getByText("Share of customers with 2+ orders")).toBeInTheDocument()
  })

  it.each(["averageProductsPerOrder", "total"] as const)("leaves the %s card without a caption", (statKey) => {
    renderWithProviders(<CaptionProbe statKey={statKey} />)

    expect(screen.getByText("no caption")).toBeInTheDocument()
  })
})

describe("CustomerStatCard rendering", () => {
  it("labels the card from the stat key and shows the formatted value", () => {
    renderWithProviders(<CustomerStatCard config={configFor("total")} displayValue="1,204" valuesPending={false} />)

    expect(screen.getByText("Total Customers")).toBeInTheDocument()
    expect(screen.getByText("1,204")).toBeInTheDocument()
  })

  it("hides the value behind a placeholder while the stats are loading", () => {
    renderWithProviders(<CustomerStatCard config={configFor("total")} displayValue="1,204" valuesPending />)

    expect(screen.queryByText("1,204")).not.toBeInTheDocument()
  })

  it("shows the caption it was given", () => {
    renderWithProviders(
      <CustomerStatCard
        caption="Customers with at least one order"
        config={configFor("averageLtv")}
        displayValue="199,00 zl"
        valuesPending={false}
      />,
    )

    expect(screen.getByText("Customers with at least one order")).toBeInTheDocument()
  })

  it("is not a button when the page cannot filter by it", () => {
    renderWithProviders(<CustomerStatCard config={configFor("total")} displayValue="1,204" valuesPending={false} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("is not a button for a stat that carries no filter", () => {
    renderWithProviders(
      <CustomerStatCard config={configFor("averageLtv")} displayValue="199,00 zl" onFilter={createFilterSpy()} valuesPending={false} />,
    )

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("CustomerStatCard filtering", () => {
  it("shows the total card as the active filter when nothing is filtered", () => {
    renderWithProviders(
      <CustomerStatCard config={configFor("total")} displayValue="1,204" onFilter={createFilterSpy()} valuesPending={false} />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
  })

  it("shows the total card as inactive once another filter is applied", () => {
    renderWithProviders(
      <CustomerStatCard
        activeFilter={ADMIN_CUSTOMER_STAT_FILTER.RETURNING}
        config={configFor("total")}
        displayValue="1,204"
        onFilter={createFilterSpy()}
        valuesPending={false}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
  })

  it("clears the filter when the total card is pressed", () => {
    const onFilter = createFilterSpy()
    renderWithProviders(
      <CustomerStatCard
        activeFilter={ADMIN_CUSTOMER_STAT_FILTER.RETURNING}
        config={configFor("total")}
        displayValue="1,204"
        onFilter={onFilter}
        valuesPending={false}
      />,
    )
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith()
  })

  it("applies the returning filter when its card is pressed", () => {
    const onFilter = createFilterSpy()
    renderWithProviders(
      <CustomerStatCard config={configFor("returningRate")} displayValue="38%" onFilter={onFilter} valuesPending={false} />,
    )
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith(ADMIN_CUSTOMER_STAT_FILTER.RETURNING)
  })

  it("toggles the returning filter off when its card is already active", () => {
    const onFilter = createFilterSpy()
    renderWithProviders(
      <CustomerStatCard
        activeFilter={ADMIN_CUSTOMER_STAT_FILTER.RETURNING}
        config={configFor("returningRate")}
        displayValue="38%"
        onFilter={onFilter}
        valuesPending={false}
      />,
    )
    const button = screen.getByRole("button")

    expect(button).toHaveAttribute("aria-pressed", "true")

    fireEvent.click(button)

    expect(onFilter).toHaveBeenCalledWith(undefined)
  })

  it("refuses to filter while the values are still loading", () => {
    const onFilter = createFilterSpy()
    renderWithProviders(<CustomerStatCard config={configFor("total")} displayValue="1,204" onFilter={onFilter} valuesPending />)
    const button = screen.getByRole("button")

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")

    fireEvent.click(button)

    expect(onFilter).not.toHaveBeenCalled()
  })
})
