import { type ReactNode } from "react"

import { QueryClient, useMutation } from "@tanstack/react-query"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import { useAttributeOrdering } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attribute-ordering"

const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })

const router = createTestRouter()

const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
  <TestProviders queryClient={queryClient} router={router}>
    {children}
  </TestProviders>
)

const buildAttribute = (id: string, rank: number): ProductAttribute["adminListItem"] => ({
  allowedValues: null,
  createdAt: new Date(0),
  handle: id,
  id,
  productCount: 0,
  rank,
  titles: { "en-US": id, "pl-PL": id },
  type: "text",
  unit: null,
  updatedAt: new Date(0),
})

const ATTRIBUTES = [buildAttribute("a", 1), buildAttribute("b", 2), buildAttribute("c", 3)]

const renderOrdering = (data: ProductAttribute["adminListItem"][] = ATTRIBUTES) => {
  const mutate = vi.fn()
  const hook = renderHook(
    () => {
      const reorder = useMutation({
        mutationFn: (ids: string[]) => {
          mutate(ids)

          return Promise.resolve({ ok: true })
        },
      })

      return useAttributeOrdering(data, reorder)
    },
    { wrapper },
  )

  return { mutate, ...hook }
}

const ids = (items: readonly ProductAttribute["adminListItem"][]): string[] => items.map((item) => item.id)

afterEach(() => {
  cleanup()
})

describe("useAttributeOrdering", () => {
  it("starts from the server order with nothing dragging", () => {
    const { result } = renderOrdering()

    expect(ids(result.current.items)).toStrictEqual(["a", "b", "c"])
    expect(result.current.draggingId).toBeUndefined()
  })

  it("records the dragged row", () => {
    const { result } = renderOrdering()

    act(() => {
      result.current.handleDragStart("c")
    })

    expect(result.current.draggingId).toBe("c")
  })

  it("ignores a drag enter before any drag start", () => {
    const { result } = renderOrdering()

    act(() => {
      result.current.handleDragEnter("a")
    })

    expect(ids(result.current.items)).toStrictEqual(["a", "b", "c"])
  })

  it("ignores a drag enter over the dragged row itself", () => {
    const { result } = renderOrdering()

    act(() => {
      result.current.handleDragStart("c")
    })
    act(() => {
      result.current.handleDragEnter("c")
    })

    expect(ids(result.current.items)).toStrictEqual(["a", "b", "c"])
  })

  it("moves the dragged row before the row it enters", () => {
    const { result } = renderOrdering()

    act(() => {
      result.current.handleDragStart("c")
    })
    act(() => {
      result.current.handleDragEnter("a")
    })

    expect(ids(result.current.items)).toStrictEqual(["c", "a", "b"])
  })

  it("persists the new order on drop and stops dragging", async () => {
    const { mutate, result } = renderOrdering()

    act(() => {
      result.current.handleDragStart("c")
    })
    act(() => {
      result.current.handleDragEnter("a")
    })
    act(() => {
      result.current.handleDrop()
    })

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(["c", "a", "b"])
    })
    expect(result.current.draggingId).toBeUndefined()
  })

  it("does not persist a drop that left the order unchanged", () => {
    const { mutate, result } = renderOrdering()

    act(() => {
      result.current.handleDragStart("b")
    })
    act(() => {
      result.current.handleDrop()
    })

    expect(mutate).not.toHaveBeenCalled()
  })
})

describe("useAttributeOrdering row moves", () => {
  it("moves a row up and persists it", async () => {
    const { mutate, result } = renderOrdering()

    act(() => {
      result.current.handleMove("c", "up")
    })

    expect(ids(result.current.items)).toStrictEqual(["a", "c", "b"])
    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(["a", "c", "b"])
    })
  })

  it("moves a row down and persists it", async () => {
    const { mutate, result } = renderOrdering()

    act(() => {
      result.current.handleMove("a", "down")
    })

    expect(ids(result.current.items)).toStrictEqual(["b", "a", "c"])
    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(["b", "a", "c"])
    })
  })

  it("ignores moving the first row up", () => {
    const { mutate, result } = renderOrdering()

    act(() => {
      result.current.handleMove("a", "up")
    })

    expect(ids(result.current.items)).toStrictEqual(["a", "b", "c"])
    expect(mutate).not.toHaveBeenCalled()
  })

  it("ignores moving the last row down", () => {
    const { mutate, result } = renderOrdering()

    act(() => {
      result.current.handleMove("c", "down")
    })

    expect(ids(result.current.items)).toStrictEqual(["a", "b", "c"])
    expect(mutate).not.toHaveBeenCalled()
  })

  it("ignores moving a row that is not in the list", () => {
    const { mutate, result } = renderOrdering()

    act(() => {
      result.current.handleMove("missing", "up")
    })

    expect(ids(result.current.items)).toStrictEqual(["a", "b", "c"])
    expect(mutate).not.toHaveBeenCalled()
  })

  it("adopts a new server order while nothing is dragging", () => {
    const { rerender, result } = renderOrdering()

    expect(ids(result.current.items)).toStrictEqual(["a", "b", "c"])

    rerender()

    expect(ids(result.current.items)).toStrictEqual(["a", "b", "c"])
  })

  it("keeps the local order while a row is being dragged", () => {
    const { result } = renderOrdering()

    act(() => {
      result.current.handleDragStart("c")
    })
    act(() => {
      result.current.handleDragEnter("a")
    })
    act(() => {
      result.current.handleDragStart("c")
    })

    expect(ids(result.current.items)).toStrictEqual(["c", "a", "b"])
  })
})
