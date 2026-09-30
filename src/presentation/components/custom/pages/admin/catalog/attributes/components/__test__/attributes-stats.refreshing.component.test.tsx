import { Suspense } from "react"

import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

const STATS_QUERY_KEY = ["admin", "attributes", "stats"]

const refetch = vi.hoisted(() => {
  const stats: ProductAttribute["stats"] = { inUse: 3, total: 4, unused: 1, withChoices: 2 }
  const held: { resolve: (() => void) | undefined } = { resolve: undefined }

  return {
    fetched: { count: 0 },
    held,
    stats,
  }
})

vi.mock("~/src/modules/product-attribute/use-cases/get-product-attribute-stats", () => ({
  getProductAttributeStatsQuery: () => ({
    queryFn: () => {
      refetch.fetched.count += 1
      if (refetch.fetched.count === 1) {
        return Promise.resolve(refetch.stats)
      }

      return new Promise<ProductAttribute["stats"]>((resolve) => {
        refetch.held.resolve = () => {
          resolve(refetch.stats)
        }
      })
    },
    queryKey: STATS_QUERY_KEY,
  }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-data-grid", () => ({
  useAttributesDataGridContext: () => ({ activeStatFilter: undefined, applyAttributeStatFilter: vi.fn() }),
}))

import { AttributesStats } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-stats"

const renderSettledStats = async () => {
  const rendered = renderWithProviders(
    <Suspense fallback="loading stats">
      <AttributesStats />
    </Suspense>,
  )
  await screen.findByText("All attributes")

  return rendered
}

const totalCard = (): HTMLElement => {
  const card = screen.getByText("All attributes").closest("button")
  if (card === null) {
    throw new Error("expected the total attributes card to be a button")
  }

  return card
}

const startRefetch = async (queryClient: { invalidateQueries: (filters: { queryKey: string[] }) => Promise<void> }): Promise<void> => {
  act(() => {
    void queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY })
  })
  await waitFor(() => {
    expect(totalCard()).toHaveAttribute("aria-busy", "true")
  })
}

beforeEach(() => {
  refetch.fetched.count = 0
  refetch.held.resolve = undefined
})

afterEach(cleanup)

describe("AttributesStats while the figures are being refreshed", () => {
  it("shows the settled figures before any refresh starts", async () => {
    await renderSettledStats()

    expect(screen.getByText("4")).toBeInTheDocument()
    expect(totalCard()).toHaveAttribute("aria-busy", "false")
  })

  it("stops offering the stale figures for filtering", async () => {
    const { queryClient } = await renderSettledStats()

    await startRefetch(queryClient)

    expect(totalCard()).toBeDisabled()
  })

  it("withdraws the share captions rather than leaving stale ones on screen", async () => {
    const { queryClient } = await renderSettledStats()
    expect(screen.getByText("75% of all")).toBeInTheDocument()

    await startRefetch(queryClient)

    expect(screen.queryByText("75% of all")).toBeNull()
    expect(screen.queryByText("25% of all")).toBeNull()
  })

  it("brings the captions back once the refreshed figures arrive", async () => {
    const { queryClient } = await renderSettledStats()
    await startRefetch(queryClient)

    act(() => {
      refetch.held.resolve?.()
    })

    await waitFor(() => {
      expect(screen.getByText("75% of all")).toBeInTheDocument()
    })
    expect(totalCard()).toBeEnabled()
  })
})
