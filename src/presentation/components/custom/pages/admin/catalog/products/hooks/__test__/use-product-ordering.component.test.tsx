import { type JSX, type ReactNode } from "react"

import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { type Product } from "~/src/modules/product/product.types"

import { useProductOrdering } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-product-ordering"

const product = (id: string, rank: number): Product["adminListItem"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  descriptions: null,
  handle: `handle-${id}`,
  id,
  inventoryLevel: "ok",
  metadata: null,
  primaryCategoryId: null,
  rank,
  status: "published",
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: { "en-US": `Product ${id}`, "pl-PL": `Produkt ${id}` },
  totalStock: 5,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  variantCount: 1,
})

const rows = [product("a", 0), product("b", 1), product("c", 2)]

const reorderCalls: string[][] = []

const useOrderingHarness = (data: Product["adminListItem"][]) => {
  const reorder = useMutation({
    mutationFn: (ids: string[]) => {
      reorderCalls.push(ids)

      return Promise.resolve({ ok: true })
    },
  })

  return useProductOrdering(data, reorder)
}

const wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>
)

const idsOf = (items: readonly Product["adminListItem"][]): string[] => items.map((item) => item.id)

beforeEach(() => {
  reorderCalls.length = 0
})

afterEach(() => {
  cleanup()
})

describe("useProductOrdering drag ordering", () => {
  it("mirrors the server order until something is dragged", () => {
    const { result } = renderHook(() => useOrderingHarness(rows), { wrapper })

    expect(idsOf(result.current.items)).toStrictEqual(["a", "b", "c"])
    expect(result.current.draggingId).toBeUndefined()
  })

  it("remembers which row is being dragged", () => {
    const { result } = renderHook(() => useOrderingHarness(rows), { wrapper })

    act(() => {
      result.current.handleDragStart("c")
    })

    expect(result.current.draggingId).toBe("c")
  })

  it("moves the dragged row in front of the row it is dragged over without saving yet", () => {
    const { result } = renderHook(() => useOrderingHarness(rows), { wrapper })

    act(() => {
      result.current.handleDragStart("c")
    })
    act(() => {
      result.current.handleDragEnter("a")
    })

    expect(idsOf(result.current.items)).toStrictEqual(["c", "a", "b"])
    expect(reorderCalls).toStrictEqual([])
  })

  it("ignores a drag enter when nothing is being dragged", () => {
    const { result } = renderHook(() => useOrderingHarness(rows), { wrapper })

    act(() => {
      result.current.handleDragEnter("a")
    })

    expect(idsOf(result.current.items)).toStrictEqual(["a", "b", "c"])
  })

  it("ignores a row dragged over itself", () => {
    const { result } = renderHook(() => useOrderingHarness(rows), { wrapper })

    act(() => {
      result.current.handleDragStart("b")
    })
    act(() => {
      result.current.handleDragEnter("b")
    })

    expect(idsOf(result.current.items)).toStrictEqual(["a", "b", "c"])
  })

  it("persists the new order on drop and clears the dragged row", async () => {
    const { result } = renderHook(() => useOrderingHarness(rows), { wrapper })

    act(() => {
      result.current.handleDragStart("c")
    })
    act(() => {
      result.current.handleDragEnter("a")
    })
    act(() => {
      result.current.handleDrop()
    })

    expect(result.current.draggingId).toBeUndefined()
    await waitFor(() => {
      expect(reorderCalls).toStrictEqual([["c", "a", "b"]])
    })
  })

  it("does not call the server when the row was dropped back where it started", () => {
    const { result } = renderHook(() => useOrderingHarness(rows), { wrapper })

    act(() => {
      result.current.handleDragStart("b")
    })
    act(() => {
      result.current.handleDrop()
    })

    expect(reorderCalls).toStrictEqual([])
  })
})

describe("useProductOrdering keyboard moves", () => {
  it("moves a row up one place and persists it", async () => {
    const { result } = renderHook(() => useOrderingHarness(rows), { wrapper })

    act(() => {
      result.current.handleMove("c", "up")
    })

    expect(idsOf(result.current.items)).toStrictEqual(["a", "c", "b"])
    await waitFor(() => {
      expect(reorderCalls).toStrictEqual([["a", "c", "b"]])
    })
  })

  it("moves a row down one place and persists it", async () => {
    const { result } = renderHook(() => useOrderingHarness(rows), { wrapper })

    act(() => {
      result.current.handleMove("a", "down")
    })

    expect(idsOf(result.current.items)).toStrictEqual(["b", "a", "c"])
    await waitFor(() => {
      expect(reorderCalls).toStrictEqual([["b", "a", "c"]])
    })
  })

  it("refuses to move the first row up", () => {
    const { result } = renderHook(() => useOrderingHarness(rows), { wrapper })

    act(() => {
      result.current.handleMove("a", "up")
    })

    expect(idsOf(result.current.items)).toStrictEqual(["a", "b", "c"])
    expect(reorderCalls).toStrictEqual([])
  })

  it("refuses to move the last row down", () => {
    const { result } = renderHook(() => useOrderingHarness(rows), { wrapper })

    act(() => {
      result.current.handleMove("c", "down")
    })

    expect(idsOf(result.current.items)).toStrictEqual(["a", "b", "c"])
    expect(reorderCalls).toStrictEqual([])
  })

  it("ignores a move request for a row it does not hold", () => {
    const { result } = renderHook(() => useOrderingHarness(rows), { wrapper })

    act(() => {
      result.current.handleMove("missing", "up")
    })

    expect(idsOf(result.current.items)).toStrictEqual(["a", "b", "c"])
    expect(reorderCalls).toStrictEqual([])
  })
})

describe("useProductOrdering server resynchronisation", () => {
  it("adopts a fresh server order once nothing is being dragged", () => {
    const { rerender, result } = renderHook((data: Product["adminListItem"][] = rows) => useOrderingHarness(data), { wrapper })

    rerender([product("c", 0), product("b", 1), product("a", 2)])

    expect(idsOf(result.current.items)).toStrictEqual(["c", "b", "a"])
  })

  it("keeps the local order while a row is still being dragged", () => {
    const { rerender, result } = renderHook((data: Product["adminListItem"][] = rows) => useOrderingHarness(data), { wrapper })

    act(() => {
      result.current.handleDragStart("c")
    })
    act(() => {
      result.current.handleDragEnter("a")
    })
    rerender([product("a", 0), product("b", 1), product("c", 2)])

    expect(idsOf(result.current.items)).toStrictEqual(["c", "a", "b"])
  })
})
