import { type JSX, type ReactNode } from "react"

import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import { useCollectionOrdering } from "~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collection-ordering"

const collection = (id: string, rank: number): ProductCollection["adminListItem"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  descriptions: null,
  handle: `handle-${id}`,
  id,
  image: null,
  metadata: null,
  productCount: 1,
  rank,
  status: "active",
  titles: { "en-US": `Collection ${id}`, "pl-PL": `Kolekcja ${id}` },
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
})

const rows = [collection("a", 0), collection("b", 1), collection("c", 2)]

const reorderCalls: string[][] = []

const useOrderingHarness = (data: ProductCollection["adminListItem"][]) => {
  const reorder = useMutation({
    mutationFn: (ids: string[]) => {
      reorderCalls.push(ids)

      return Promise.resolve({ ok: true })
    },
  })

  return useCollectionOrdering(data, reorder)
}

const wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>
)

const idsOf = (items: readonly ProductCollection["adminListItem"][]): string[] => items.map((item) => item.id)

beforeEach(() => {
  reorderCalls.length = 0
})

afterEach(() => {
  cleanup()
})

describe("useCollectionOrdering", () => {
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

  it("moves the dragged row in front of the row it is dragged over", () => {
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

describe("useCollectionOrdering keyboard moves", () => {
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

describe("useCollectionOrdering server resynchronisation", () => {
  it("adopts a fresh server order once nothing is being dragged", () => {
    const { rerender, result } = renderHook((data: ProductCollection["adminListItem"][] = rows) => useOrderingHarness(data), { wrapper })

    rerender([collection("c", 0), collection("b", 1), collection("a", 2)])

    expect(idsOf(result.current.items)).toStrictEqual(["c", "b", "a"])
  })

  it("keeps the local order while a row is still being dragged", () => {
    const { rerender, result } = renderHook((data: ProductCollection["adminListItem"][] = rows) => useOrderingHarness(data), { wrapper })

    act(() => {
      result.current.handleDragStart("c")
    })
    act(() => {
      result.current.handleDragEnter("a")
    })
    rerender([collection("a", 0), collection("b", 1), collection("c", 2)])

    expect(idsOf(result.current.items)).toStrictEqual(["c", "a", "b"])
  })
})
