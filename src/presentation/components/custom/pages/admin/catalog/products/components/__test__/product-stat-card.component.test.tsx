import { type JSX } from "react"

import { cleanup, fireEvent, screen } from "@testing-library/react"
import { useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_INVENTORY_LEVEL, PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"

import {
  ProductStatCard,
  buildProductStatCaption,
} from "~/src/presentation/components/custom/pages/admin/catalog/products/components/product-stat-card"
import { type ProductsListFilterPatch } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid"
import {
  PRODUCT_STAT_CARDS,
  type ProductStatCardConfig,
  type ProductStatKey,
} from "~/src/presentation/components/custom/pages/admin/catalog/products/products-stats.config"

const cardConfig = (key: ProductStatKey): ProductStatCardConfig => {
  const config = PRODUCT_STAT_CARDS.find((candidate) => candidate.key === key)
  if (config === undefined) {
    throw new Error(`No product stat card is configured for ${key}`)
  }

  return config
}

const CaptionProbe = ({
  statKey,
  stats,
  value,
}: Readonly<{ statKey: ProductStatKey; stats: Product["stats"]; value: number }>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")

  return <span data-testid="caption">{buildProductStatCaption({ key: statKey, stats, t, value }) ?? "no caption"}</span>
}

const stats: Product["stats"] = { active: 6, archived: 1, draft: 2, lowStock: 3, total: 12 }

afterEach(() => {
  cleanup()
})

describe("ProductStatCard", () => {
  it("shows the translated label next to the value", () => {
    renderWithProviders(<ProductStatCard config={cardConfig("total")} displayValue="12" valuesPending={false} />)

    expect(screen.getByText("Total products")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
  })

  it("shows the caption it was handed", () => {
    renderWithProviders(<ProductStatCard caption="50% of total" config={cardConfig("active")} displayValue="6" valuesPending={false} />)

    expect(screen.getByText("50% of total")).toBeInTheDocument()
  })

  it("hides the value while the stats are still loading", () => {
    renderWithProviders(
      <ProductStatCard
        config={cardConfig("active")}
        displayValue="6"
        valuesPending
        onFilter={vi.fn<(patch?: ProductsListFilterPatch) => void>()}
      />,
    )

    expect(screen.queryByText("6")).not.toBeInTheDocument()
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("renders no button when there is no filter handler", () => {
    renderWithProviders(<ProductStatCard config={cardConfig("active")} displayValue="6" valuesPending={false} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("keeps a card without a configured filter informational even when a filter handler is available", () => {
    const onFilter = vi.fn<(patch?: ProductsListFilterPatch) => void>()
    const config: ProductStatCardConfig = { gradient: "", icon: cardConfig("active").icon, key: "active" }
    renderWithProviders(
      <ProductStatCard
        activeInventoryFilter={PRODUCT_INVENTORY_LEVEL.LOW}
        activeStatusFilter={PRODUCT_STATUS.PUBLISHED}
        config={config}
        displayValue="6"
        valuesPending={false}
        onFilter={onFilter}
      />,
    )

    expect(screen.getByText("Active products")).toBeInTheDocument()
    expect(screen.getByText("6")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    fireEvent.click(screen.getByText("Active products"))
    expect(onFilter).not.toHaveBeenCalled()
  })

  it("clears every filter when the total card is pressed", () => {
    const onFilter = vi.fn<(patch?: ProductsListFilterPatch) => void>()
    renderWithProviders(
      <ProductStatCard
        activeStatusFilter={PRODUCT_STATUS.DRAFT}
        config={cardConfig("total")}
        displayValue="12"
        valuesPending={false}
        onFilter={onFilter}
      />,
    )
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith()
  })

  it("applies the published status filter from the active card", () => {
    const onFilter = vi.fn<(patch?: ProductsListFilterPatch) => void>()
    renderWithProviders(<ProductStatCard config={cardConfig("active")} displayValue="6" valuesPending={false} onFilter={onFilter} />)
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith({ status: PRODUCT_STATUS.PUBLISHED })
  })

  it("drops the status filter when the active card is pressed again", () => {
    const onFilter = vi.fn<(patch?: ProductsListFilterPatch) => void>()
    renderWithProviders(
      <ProductStatCard
        activeStatusFilter={PRODUCT_STATUS.PUBLISHED}
        config={cardConfig("active")}
        displayValue="6"
        valuesPending={false}
        onFilter={onFilter}
      />,
    )
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith({ status: undefined })
  })

  it("applies the low stock inventory filter from its card", () => {
    const onFilter = vi.fn<(patch?: ProductsListFilterPatch) => void>()
    renderWithProviders(<ProductStatCard config={cardConfig("lowStock")} displayValue="3" valuesPending={false} onFilter={onFilter} />)
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith({ inventoryLevel: PRODUCT_INVENTORY_LEVEL.LOW })
  })

  it("drops the inventory filter when the low stock card is pressed again", () => {
    const onFilter = vi.fn<(patch?: ProductsListFilterPatch) => void>()
    renderWithProviders(
      <ProductStatCard
        activeInventoryFilter={PRODUCT_INVENTORY_LEVEL.LOW}
        config={cardConfig("lowStock")}
        displayValue="3"
        valuesPending={false}
        onFilter={onFilter}
      />,
    )
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith({ inventoryLevel: undefined })
  })

  it("ignores a press while the stats are still loading", () => {
    const onFilter = vi.fn<(patch?: ProductsListFilterPatch) => void>()
    renderWithProviders(<ProductStatCard config={cardConfig("active")} displayValue="6" valuesPending onFilter={onFilter} />)
    fireEvent.click(screen.getByRole("button"))

    expect(onFilter).not.toHaveBeenCalled()
  })
})

describe("ProductStatCard pressed state", () => {
  it("marks the total card as pressed while no filter is set", () => {
    renderWithProviders(
      <ProductStatCard
        config={cardConfig("total")}
        displayValue="12"
        valuesPending={false}
        onFilter={vi.fn<(patch?: ProductsListFilterPatch) => void>()}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
  })

  it("leaves the total card unpressed while a category narrows the list", () => {
    renderWithProviders(
      <ProductStatCard
        activeCategoryFilter="cat-1"
        config={cardConfig("total")}
        displayValue="12"
        valuesPending={false}
        onFilter={vi.fn<(patch?: ProductsListFilterPatch) => void>()}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
  })

  it("leaves the total card unpressed while a collection narrows the list", () => {
    renderWithProviders(
      <ProductStatCard
        activeCollectionFilter="col-1"
        config={cardConfig("total")}
        displayValue="12"
        valuesPending={false}
        onFilter={vi.fn<(patch?: ProductsListFilterPatch) => void>()}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
  })

  it("leaves the total card unpressed while a variant kind narrows the list", () => {
    renderWithProviders(
      <ProductStatCard
        activeVariantKindFilter="single"
        config={cardConfig("total")}
        displayValue="12"
        valuesPending={false}
        onFilter={vi.fn<(patch?: ProductsListFilterPatch) => void>()}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
  })

  it("leaves the total card unpressed while an inventory level narrows the list", () => {
    renderWithProviders(
      <ProductStatCard
        activeInventoryFilter={PRODUCT_INVENTORY_LEVEL.LOW}
        config={cardConfig("total")}
        displayValue="12"
        valuesPending={false}
        onFilter={vi.fn<(patch?: ProductsListFilterPatch) => void>()}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false")
  })

  it("marks the draft card as pressed while the draft status filter is set", () => {
    renderWithProviders(
      <ProductStatCard
        activeStatusFilter={PRODUCT_STATUS.DRAFT}
        config={cardConfig("draft")}
        displayValue="2"
        valuesPending={false}
        onFilter={vi.fn<(patch?: ProductsListFilterPatch) => void>()}
      />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
  })
})

describe("buildProductStatCaption", () => {
  it.each([
    ["active", 6, "50% of total"],
    ["draft", 2, "17% of total"],
  ] as const)("reports the share of the catalog the %s stat covers", (statKey, value, expected) => {
    renderWithProviders(<CaptionProbe statKey={statKey} stats={stats} value={value} />)

    expect(screen.getByTestId("caption")).toHaveTextContent(expected)
  })

  it("reports a zero share for an empty catalog", () => {
    renderWithProviders(<CaptionProbe statKey="active" stats={{ active: 0, archived: 0, draft: 0, lowStock: 0, total: 0 }} value={0} />)

    expect(screen.getByTestId("caption")).toHaveTextContent("0% of total")
  })

  it.each(["total", "lowStock", "archived"] as const)("has no caption for the %s stat", (statKey) => {
    renderWithProviders(<CaptionProbe statKey={statKey} stats={stats} value={3} />)

    expect(screen.getByTestId("caption")).toHaveTextContent("no caption")
  })
})
