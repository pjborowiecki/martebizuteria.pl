import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { type ProductOrdering } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-product-ordering"
import { useProductsRowReorder } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-row-reorder"

const ordering = (): ProductOrdering => ({
  draggingId: "product-2",
  handleDragEnter: vi.fn<(overId: string) => void>(),
  handleDragStart: vi.fn<(id: string) => void>(),
  handleDrop: vi.fn<() => void>(),
  handleMove: vi.fn<(id: string, direction: "up" | "down") => void>(),
  items: [],
})

afterEach(() => {
  cleanup()
})

describe("useProductsRowReorder", () => {
  it("enables reordering only while the grid shows its natural order", () => {
    const { result } = renderHook(() =>
      useProductsRowReorder({ columnFilters: [], hasServerListQuery: false, ordering: ordering(), sorting: [] }),
    )

    expect(result.current.enabled).toBe(true)
  })

  it("disables reordering while the list is sorted by a column", () => {
    const { result } = renderHook(() =>
      useProductsRowReorder({
        columnFilters: [],
        hasServerListQuery: false,
        ordering: ordering(),
        sorting: [{ desc: false, id: "title" }],
      }),
    )

    expect(result.current.enabled).toBe(false)
  })

  it("disables reordering while a column filter narrows the list", () => {
    const { result } = renderHook(() =>
      useProductsRowReorder({
        columnFilters: [{ id: "status", value: "draft" }],
        hasServerListQuery: false,
        ordering: ordering(),
        sorting: [],
      }),
    )

    expect(result.current.enabled).toBe(false)
  })

  it("disables reordering while the rows come from a server query", () => {
    const { result } = renderHook(() =>
      useProductsRowReorder({ columnFilters: [], hasServerListQuery: true, ordering: ordering(), sorting: [] }),
    )

    expect(result.current.enabled).toBe(false)
  })

  it("forwards the ordering handlers and the dragged row id", () => {
    const productOrdering = ordering()
    const { result } = renderHook(() =>
      useProductsRowReorder({ columnFilters: [], hasServerListQuery: false, ordering: productOrdering, sorting: [] }),
    )

    result.current.onRowDragStart("product-1")
    result.current.onRowDragEnter("product-3")
    result.current.onRowDrop()
    result.current.onRowMove("product-1", "down")

    expect(result.current.draggingId).toBe("product-2")
    expect(productOrdering.handleDragStart).toHaveBeenCalledWith("product-1")
    expect(productOrdering.handleDragEnter).toHaveBeenCalledWith("product-3")
    expect(productOrdering.handleDrop).toHaveBeenCalledTimes(1)
    expect(productOrdering.handleMove).toHaveBeenCalledWith("product-1", "down")
  })

  it("keeps the same api object while the ordering and the flags are unchanged", () => {
    const productOrdering = ordering()
    const { rerender, result } = renderHook(() =>
      useProductsRowReorder({ columnFilters: [], hasServerListQuery: false, ordering: productOrdering, sorting: [] }),
    )
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})
