import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { CheckCircle2, Layers } from "lucide-react"
import { useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants"
import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import {
  type CollectionStatCardConfig,
  type CollectionStatKey,
} from "~/src/presentation/components/custom/pages/admin/catalog/collections/collections-stats.config"
import {
  CollectionStatCard,
  buildCollectionStatCaption,
  formatCollectionStatValue,
} from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collection-stat-card"

const TOTAL_CARD: CollectionStatCardConfig = {
  gradient: "from-violet-500/20",
  icon: Layers,
  key: "total",
}

const ACTIVE_CARD: CollectionStatCardConfig = {
  filterStatus: COLLECTION_STATUS.ACTIVE,
  gradient: "from-emerald-500/20",
  icon: CheckCircle2,
  key: "active",
}

const CaptionProbe = ({
  statKey,
  stats,
  value,
}: Readonly<{ statKey: CollectionStatKey; stats: ProductCollection["stats"]; value: number }>) => {
  const t = useTranslations("pages.admin.catalog.collections")

  return <span data-testid="caption">{buildCollectionStatCaption({ key: statKey, stats, t, value }) ?? "none"}</span>
}

const renderCaption = (statKey: CollectionStatKey, stats: ProductCollection["stats"], value: number) => {
  renderWithProviders(<CaptionProbe statKey={statKey} stats={stats} value={value} />)

  return screen.getByTestId("caption").textContent
}

const filterSpy = () => vi.fn<(status?: "active" | "draft") => void>()

const stats = (overrides: Partial<ProductCollection["stats"]> = {}): ProductCollection["stats"] => ({
  active: 24,
  avgProducts: 12.5,
  draft: 4,
  total: 28,
  ...overrides,
})

describe("formatCollectionStatValue", () => {
  it("renders a count without decimals", () => {
    expect(formatCollectionStatValue("total", 1234)).toBe((1234).toLocaleString())
  })

  it("keeps a single decimal for the average products per collection", () => {
    expect(formatCollectionStatValue("avgProducts", 12.55)).toBe((12.6).toLocaleString(undefined, { maximumFractionDigits: 1 }))
  })
})

describe("buildCollectionStatCaption", () => {
  afterEach(() => {
    cleanup()
  })

  it("reports the share of the total for the active count", () => {
    expect(renderCaption("active", stats(), 14)).toBe("50% of total")
  })

  it("reports the share of the total for the draft count", () => {
    expect(renderCaption("draft", stats(), 7)).toBe("25% of total")
  })

  it("reports a zero share when there are no collections at all", () => {
    expect(renderCaption("active", stats({ total: 0 }), 0)).toBe("0% of total")
  })

  it("reports how many products the average covers", () => {
    expect(renderCaption("avgProducts", stats({ avgProducts: 2, total: 10 }), 2)).toBe("~20 products assigned")
  })

  it("leaves the total card without a caption", () => {
    expect(renderCaption("total", stats(), 28)).toBe("none")
  })
})

describe("CollectionStatCard", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows the translated label, the value and the caption", () => {
    renderWithProviders(
      <CollectionStatCard caption="50% of total" config={ACTIVE_CARD} displayValue="24" onFilter={filterSpy()} valuesPending={false} />,
    )

    expect(screen.getByText("Active Collections")).toBeInTheDocument()
    expect(screen.getByText("24")).toBeInTheDocument()
    expect(screen.getByText("50% of total")).toBeInTheDocument()
  })

  it("hides the value while the numbers are being refetched", () => {
    renderWithProviders(<CollectionStatCard config={ACTIVE_CARD} displayValue="24" onFilter={filterSpy()} valuesPending />)

    expect(screen.queryByText("24")).toBeNull()
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("is not a button when no filter callback is supplied", () => {
    renderWithProviders(<CollectionStatCard config={ACTIVE_CARD} displayValue="24" valuesPending={false} />)

    expect(screen.queryByRole("button")).toBeNull()
  })

  it("applies its own status when a status card is pressed", async () => {
    const onFilter = filterSpy()
    renderWithProviders(<CollectionStatCard config={ACTIVE_CARD} displayValue="24" onFilter={onFilter} valuesPending={false} />)

    await userEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith("active")
  })

  it("clears the filter when the already active status card is pressed again", async () => {
    const onFilter = filterSpy()
    renderWithProviders(
      <CollectionStatCard activeFilter="active" config={ACTIVE_CARD} displayValue="24" onFilter={onFilter} valuesPending={false} />,
    )

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")

    await userEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith(undefined)
  })

  it("clears the filter when the total card is pressed", async () => {
    const onFilter = filterSpy()
    renderWithProviders(
      <CollectionStatCard activeFilter="active" config={TOTAL_CARD} displayValue="28" onFilter={onFilter} valuesPending={false} />,
    )

    await userEvent.click(screen.getByRole("button"))

    expect(onFilter).toHaveBeenCalledWith()
  })

  it("marks the total card as active exactly while no status filter is set", () => {
    renderWithProviders(<CollectionStatCard config={TOTAL_CARD} displayValue="28" onFilter={filterSpy()} valuesPending={false} />)

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true")
  })

  it("ignores a press while the numbers are pending", async () => {
    const onFilter = filterSpy()
    renderWithProviders(<CollectionStatCard config={ACTIVE_CARD} displayValue="24" onFilter={onFilter} valuesPending />)

    await userEvent.click(screen.getByRole("button"))

    expect(onFilter).not.toHaveBeenCalled()
  })
})
