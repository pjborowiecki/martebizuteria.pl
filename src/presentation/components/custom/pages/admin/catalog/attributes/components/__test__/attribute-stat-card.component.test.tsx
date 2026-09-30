import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Layers } from "lucide-react"
import { useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_ATTRIBUTE_STAT_FILTER, type ProductAttributeStatFilter } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import {
  type ProductAttributeStatCardConfig,
  type ProductAttributeStatKey,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/attributes-stats.config"
import {
  AttributeStatCard,
  buildAttributeStatCaption,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attribute-stat-card"

const STATS: ProductAttribute["stats"] = { inUse: 3, total: 4, unused: 1, withChoices: 2 }

const config = (overrides: Partial<ProductAttributeStatCardConfig> = {}): ProductAttributeStatCardConfig => ({
  gradient: "from-violet-500/20",
  icon: Layers,
  key: "total",
  ...overrides,
})

const CaptionProbe = ({ statKey, value }: Readonly<{ statKey: ProductAttributeStatKey; value: number }>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")

  return <span data-testid="caption">{buildAttributeStatCaption({ key: statKey, stats: STATS, t, value }) ?? "no caption"}</span>
}

const captionFor = (statKey: ProductAttributeStatKey, value: number): string => {
  renderWithProviders(<CaptionProbe statKey={statKey} value={value} />)

  return screen.getByTestId("caption").textContent
}

const filterMock = () => vi.fn<(filter?: ProductAttributeStatFilter) => void>()

afterEach(() => {
  cleanup()
})

describe("buildAttributeStatCaption", () => {
  it("reports the in use share of all attributes", () => {
    expect(captionFor("inUse", 3)).toBe("75% of all")
  })

  it("reports the unused share of all attributes", () => {
    expect(captionFor("unused", 1)).toBe("25% of all")
  })

  it("reports the choice list share of all attributes", () => {
    expect(captionFor("withChoices", 2)).toBe("50% of all")
  })

  it("has no caption for the total card", () => {
    expect(captionFor("total", 4)).toBe("no caption")
  })
})

const EmptyProbe = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const stats: ProductAttribute["stats"] = { inUse: 0, total: 0, unused: 0, withChoices: 0 }

  return <span data-testid="caption">{buildAttributeStatCaption({ key: "inUse", stats, t, value: 0 })}</span>
}

describe("buildAttributeStatCaption with no attributes at all", () => {
  it("reports a zero share instead of dividing by zero", () => {
    renderWithProviders(<EmptyProbe />)

    expect(screen.getByTestId("caption").textContent).toBe("0% of all")
  })
})

describe("AttributeStatCard", () => {
  it("renders the translated label and the value", () => {
    renderWithProviders(<AttributeStatCard config={config()} displayValue="4" valuesPending={false} />)

    expect(screen.getByText("All attributes")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
  })

  it("renders the caption under the value", () => {
    renderWithProviders(<AttributeStatCard caption="75% of all" config={config()} displayValue="4" valuesPending={false} />)

    expect(screen.getByText("75% of all")).toBeInTheDocument()
  })

  it("hides the value and caption while the stats load", () => {
    renderWithProviders(<AttributeStatCard caption="75% of all" config={config()} displayValue="4" valuesPending />)

    expect(screen.queryByText("4")).not.toBeInTheDocument()
    expect(screen.queryByText("75% of all")).not.toBeInTheDocument()
  })

  it("stays unclickable without a filter callback", () => {
    renderWithProviders(<AttributeStatCard config={config({ filterStat: PRODUCT_ATTRIBUTE_STAT_FILTER.IN_USE })} valuesPending={false} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("clears the filter from the total card", async () => {
    const onFilter = filterMock()
    renderWithProviders(
      <AttributeStatCard activeFilter={PRODUCT_ATTRIBUTE_STAT_FILTER.UNUSED} config={config()} onFilter={onFilter} valuesPending={false} />,
    )

    await userEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith()
  })

  it("applies its own stat filter when it is not active", async () => {
    const onFilter = filterMock()
    renderWithProviders(
      <AttributeStatCard
        config={config({ filterStat: PRODUCT_ATTRIBUTE_STAT_FILTER.CHOICE, key: "withChoices" })}
        onFilter={onFilter}
        valuesPending={false}
      />,
    )

    await userEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith(PRODUCT_ATTRIBUTE_STAT_FILTER.CHOICE)
  })

  it("toggles its own stat filter off when it is active", async () => {
    const onFilter = filterMock()
    renderWithProviders(
      <AttributeStatCard
        activeFilter={PRODUCT_ATTRIBUTE_STAT_FILTER.CHOICE}
        config={config({ filterStat: PRODUCT_ATTRIBUTE_STAT_FILTER.CHOICE, key: "withChoices" })}
        onFilter={onFilter}
        valuesPending={false}
      />,
    )

    await userEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith(undefined)
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
  })

  it("ignores clicks and reports busy while the stats load", async () => {
    const onFilter = filterMock()
    renderWithProviders(<AttributeStatCard config={config()} onFilter={onFilter} valuesPending />)

    await userEvent.click(screen.getByRole("button"), { pointerEventsCheck: 0 })

    expect(onFilter).not.toHaveBeenCalled()
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true")
  })
})
