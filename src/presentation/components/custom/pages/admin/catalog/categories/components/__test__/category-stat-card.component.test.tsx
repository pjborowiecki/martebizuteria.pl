import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FolderTree } from "lucide-react"
import { useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import {
  type CategoryStatCardConfig,
  type CategoryStatKey,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/categories-stats.config"
import {
  CategoryStatCard,
  buildCategoryStatCaption,
  formatCategoryStatValue,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/category-stat-card"

const STATS: ProductCategory["stats"] = { active: 6, avgProducts: 2.5, draft: 2, total: 8 }

const config = (overrides: Partial<CategoryStatCardConfig> = {}): CategoryStatCardConfig => ({
  gradient: "from-violet-500/20",
  icon: FolderTree,
  key: "total",
  ...overrides,
})

const CaptionProbe = ({
  statKey,
  stats,
  value,
}: Readonly<{ statKey: CategoryStatKey; stats: ProductCategory["stats"]; value: number }>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.categories")

  return <span data-testid="caption">{buildCategoryStatCaption({ key: statKey, stats, t, value }) ?? "no caption"}</span>
}

const captionFor = (statKey: CategoryStatKey, value: number, stats: ProductCategory["stats"] = STATS): string => {
  renderWithProviders(<CaptionProbe statKey={statKey} stats={stats} value={value} />)

  return screen.getByTestId("caption").textContent
}

afterEach(() => {
  cleanup()
})

describe("formatCategoryStatValue", () => {
  it("rounds the average products to one decimal", () => {
    expect(formatCategoryStatValue("avgProducts", 2.46)).toBe("2.5")
  })

  it("drops a trailing zero decimal from the average", () => {
    expect(formatCategoryStatValue("avgProducts", 3)).toBe("3")
  })

  it("formats a count with thousands grouping", () => {
    expect(formatCategoryStatValue("total", 1234)).toBe((1234).toLocaleString())
  })
})

describe("buildCategoryStatCaption", () => {
  it("reports the active share of the total", () => {
    expect(captionFor("active", 6)).toBe("75% of total")
  })

  it("reports the draft share of the total", () => {
    expect(captionFor("draft", 2)).toBe("25% of total")
  })

  it("estimates the assigned product count for the average", () => {
    expect(captionFor("avgProducts", 2.5)).toBe("~20 products assigned")
  })

  it("has no caption for the total card", () => {
    expect(captionFor("total", 8)).toBe("no caption")
  })

  it("reports a zero share for an empty catalog instead of dividing by zero", () => {
    expect(captionFor("active", 0, { active: 0, avgProducts: 0, draft: 0, total: 0 })).toBe("0% of total")
  })
})

describe("CategoryStatCard", () => {
  it("renders the translated label and the formatted value", () => {
    renderWithProviders(<CategoryStatCard config={config()} displayValue="8" valuesPending={false} />)

    expect(screen.getByText("Total Categories")).toBeInTheDocument()
    expect(screen.getByText("8")).toBeInTheDocument()
  })

  it("hides the value behind a skeleton while the stats load", () => {
    renderWithProviders(<CategoryStatCard config={config()} displayValue="8" valuesPending />)

    expect(screen.queryByText("8")).not.toBeInTheDocument()
  })

  it("renders as plain content when no filter callback is given", () => {
    renderWithProviders(<CategoryStatCard config={config({ filterStatus: CATEGORY_STATUS.ACTIVE })} valuesPending={false} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("clears the filter from the total card", async () => {
    const onFilter = vi.fn<(status?: "active" | "draft") => void>()
    renderWithProviders(<CategoryStatCard activeFilter="active" config={config()} onFilter={onFilter} valuesPending={false} />)

    await userEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith()
  })

  it("marks the total card as pressed when no filter is active", () => {
    renderWithProviders(<CategoryStatCard config={config()} onFilter={vi.fn<() => void>()} valuesPending={false} />)

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
  })

  it("applies its own status when the card is not the active filter", async () => {
    const onFilter = vi.fn<(status?: "active" | "draft") => void>()
    renderWithProviders(
      <CategoryStatCard config={config({ filterStatus: CATEGORY_STATUS.DRAFT, key: "draft" })} onFilter={onFilter} valuesPending={false} />,
    )

    await userEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith(CATEGORY_STATUS.DRAFT)
  })

  it("toggles its own status off when it is already the active filter", async () => {
    const onFilter = vi.fn<(status?: "active" | "draft") => void>()
    renderWithProviders(
      <CategoryStatCard
        activeFilter={CATEGORY_STATUS.DRAFT}
        config={config({ filterStatus: CATEGORY_STATUS.DRAFT, key: "draft" })}
        onFilter={onFilter}
        valuesPending={false}
      />,
    )

    await userEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith(undefined)
  })

  it("ignores clicks while the stats are still loading", async () => {
    const onFilter = vi.fn<(status?: "active" | "draft") => void>()
    renderWithProviders(<CategoryStatCard config={config()} onFilter={onFilter} valuesPending />)

    await userEvent.click(screen.getByRole("button"), { pointerEventsCheck: 0 })

    expect(onFilter).not.toHaveBeenCalled()
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("renders the configured icon", () => {
    const { container } = renderWithProviders(<CategoryStatCard config={config()} valuesPending={false} />)

    expect(container.querySelector("svg.lucide-folder-tree")).not.toBeNull()
  })
})
