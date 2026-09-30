import { type ReactNode } from "react"

import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import {
  type CategoryOrdering,
  useCategoryOrdering,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-category-ordering"

const reorderRequest = vi.fn<(ids: string[]) => Promise<void> | void>()

const Providers = ({ children }: Readonly<{ children: ReactNode }>) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>{children}</QueryClientProvider>
)

const category = (id: string): ProductCategory["adminListItem"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  descriptions: null,
  handle: id,
  id,
  image: null,
  metadata: null,
  parentId: null,
  productCount: 0,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  subtitles: null,
  titles: { "en-US": id, "pl-PL": id },
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
})

const useOrderingProbe = (data: ProductCategory["adminListItem"][]): CategoryOrdering => {
  const reorder = useMutation<{ ok: boolean }, Error, string[]>({
    mutationFn: async (ids) => {
      await reorderRequest(ids)

      return { ok: true }
    },
  })

  return useCategoryOrdering(data, reorder)
}

const renderOrdering = (data: ProductCategory["adminListItem"][]) =>
  renderHook((props: ProductCategory["adminListItem"][]) => useOrderingProbe(props), { initialProps: data, wrapper: Providers })

const ids = (ordering: CategoryOrdering): string[] => ordering.items.map((item) => item.id)

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  reorderRequest.mockReset()
})

describe("useCategoryOrdering", () => {
  it("starts from the order the server sent", () => {
    const { result } = renderOrdering([category("a"), category("b"), category("c")])

    expect(ids(result.current)).toStrictEqual(["a", "b", "c"])
    expect(result.current.draggingId).toBeUndefined()
  })

  it("adopts a new server order while nothing is being dragged", () => {
    const { rerender, result } = renderOrdering([category("a"), category("b")])

    rerender([category("b"), category("a")])

    expect(ids(result.current)).toStrictEqual(["b", "a"])
  })

  it("remembers which row is being dragged", () => {
    const { result } = renderOrdering([category("a"), category("b")])

    act(() => {
      result.current.handleDragStart("a")
    })

    expect(result.current.draggingId).toBe("a")
  })

  it("moves the dragged row in front of the row it enters", () => {
    const { result } = renderOrdering([category("a"), category("b"), category("c")])

    act(() => {
      result.current.handleDragStart("c")
    })
    act(() => {
      result.current.handleDragEnter("a")
    })

    expect(ids(result.current)).toStrictEqual(["c", "a", "b"])
  })

  it("ignores a drag enter when nothing is being dragged", () => {
    const { result } = renderOrdering([category("a"), category("b")])

    act(() => {
      result.current.handleDragEnter("a")
    })

    expect(ids(result.current)).toStrictEqual(["a", "b"])
  })

  it("ignores a drag enter over the dragged row itself", () => {
    const { result } = renderOrdering([category("a"), category("b")])

    act(() => {
      result.current.handleDragStart("a")
    })
    act(() => {
      result.current.handleDragEnter("a")
    })

    expect(ids(result.current)).toStrictEqual(["a", "b"])
  })

  it("keeps the dragged order while a drag is in progress even if the server list changes", () => {
    const { rerender, result } = renderOrdering([category("a"), category("b")])

    act(() => {
      result.current.handleDragStart("b")
    })
    act(() => {
      result.current.handleDragEnter("a")
    })
    rerender([category("a"), category("b")])

    expect(ids(result.current)).toStrictEqual(["b", "a"])
  })

  it("persists the new order on drop", async () => {
    const { result } = renderOrdering([category("a"), category("b"), category("c")])

    act(() => {
      result.current.handleDragStart("c")
    })
    act(() => {
      result.current.handleDragEnter("a")
    })
    act(() => {
      result.current.handleDrop()
    })
    await flush()

    expect(reorderRequest).toHaveBeenCalledWith(["c", "a", "b"])
    expect(result.current.draggingId).toBeUndefined()
  })

  it("does not persist a drop that left the order unchanged", async () => {
    const { result } = renderOrdering([category("a"), category("b")])

    act(() => {
      result.current.handleDragStart("a")
    })
    act(() => {
      result.current.handleDrop()
    })
    await flush()

    expect(reorderRequest).not.toHaveBeenCalled()
  })

  it("keeps a pending move when stale server data arrives, then adopts the settled server order", async () => {
    const pending = Promise.withResolvers<void>()
    reorderRequest.mockReturnValueOnce(pending.promise)
    const { rerender, result } = renderOrdering([category("a"), category("b")])

    act(() => {
      result.current.handleMove("b", "up")
    })
    await waitFor(() => {
      expect(reorderRequest).toHaveBeenCalledWith(["b", "a"])
    })
    await flush()

    rerender([category("a"), category("b"), category("c")])

    expect(ids(result.current)).toStrictEqual(["b", "a"])

    await act(async () => {
      pending.resolve()
      await pending.promise
    })
    await waitFor(() => {
      expect(ids(result.current)).toStrictEqual(["a", "b", "c"])
    })
    expect(reorderRequest).toHaveBeenCalledTimes(1)
  })
})

describe("useCategoryOrdering keyboard moves", () => {
  it("moves a row up and persists the order", async () => {
    const { result } = renderOrdering([category("a"), category("b"), category("c")])

    act(() => {
      result.current.handleMove("b", "up")
    })

    expect(ids(result.current)).toStrictEqual(["b", "a", "c"])

    await flush()

    expect(reorderRequest).toHaveBeenCalledWith(["b", "a", "c"])
  })

  it("moves a row down and persists the order", async () => {
    const { result } = renderOrdering([category("a"), category("b"), category("c")])

    act(() => {
      result.current.handleMove("b", "down")
    })

    expect(ids(result.current)).toStrictEqual(["a", "c", "b"])

    await flush()

    expect(reorderRequest).toHaveBeenCalledWith(["a", "c", "b"])
  })

  it("ignores a move past the top of the list", async () => {
    const { result } = renderOrdering([category("a"), category("b")])

    act(() => {
      result.current.handleMove("a", "up")
    })
    await flush()

    expect(ids(result.current)).toStrictEqual(["a", "b"])
    expect(reorderRequest).not.toHaveBeenCalled()
  })

  it("ignores a move past the bottom of the list", async () => {
    const { result } = renderOrdering([category("a"), category("b")])

    act(() => {
      result.current.handleMove("b", "down")
    })
    await flush()

    expect(ids(result.current)).toStrictEqual(["a", "b"])
    expect(reorderRequest).not.toHaveBeenCalled()
  })

  it("ignores a move of a row that is not in the list", async () => {
    const { result } = renderOrdering([category("a"), category("b")])

    act(() => {
      result.current.handleMove("missing", "down")
    })
    await flush()

    expect(ids(result.current)).toStrictEqual(["a", "b"])
    expect(reorderRequest).not.toHaveBeenCalled()
  })
})
