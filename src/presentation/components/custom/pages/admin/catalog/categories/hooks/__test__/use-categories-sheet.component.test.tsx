import { type JSX, type ReactNode } from "react"

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

import {
  type CategoriesSheetApi,
  CategoriesSheetProvider,
  useCategoriesSheet,
  useCategoriesSheetState,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-categories-sheet"

const EPOCH = new Date("2026-01-01T00:00:00.000Z")

const CATEGORY: ProductCategory["adminListItem"] = {
  createdAt: EPOCH,
  descriptions: null,
  handle: "rings",
  id: "cat-1",
  image: null,
  metadata: null,
  parentId: null,
  productCount: 3,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  subtitles: null,
  titles: { "en-US": "Rings", "pl-PL": "Pierscionki" },
  updatedAt: EPOCH,
}

afterEach(() => {
  cleanup()
})

describe("useCategoriesSheetState", () => {
  it("starts closed with no category", () => {
    const { result } = renderHook(() => useCategoriesSheetState())

    expect(result.current.mode).toBe("closed")
    expect(result.current.open).toBe(false)
    expect(result.current.category).toBeUndefined()
  })

  it("opens for a new category without carrying one", () => {
    const { result } = renderHook(() => useCategoriesSheetState())

    act(() => {
      result.current.openCreate()
    })

    expect(result.current.mode).toBe("create")
    expect(result.current.open).toBe(true)
    expect(result.current.category).toBeUndefined()
  })

  it("opens for editing and carries the row it was given", () => {
    const { result } = renderHook(() => useCategoriesSheetState())

    act(() => {
      result.current.openEdit(CATEGORY)
    })

    expect(result.current.mode).toBe("edit")
    expect(result.current.category).toStrictEqual(CATEGORY)
  })

  it("forgets the edited category when it closes", () => {
    const { result } = renderHook(() => useCategoriesSheetState())

    act(() => {
      result.current.openEdit(CATEGORY)
    })
    act(() => {
      result.current.close()
    })

    expect(result.current.mode).toBe("closed")
    expect(result.current.category).toBeUndefined()
  })

  it("closes through setOpen(false)", () => {
    const { result } = renderHook(() => useCategoriesSheetState())

    act(() => {
      result.current.openCreate()
    })
    act(() => {
      result.current.setOpen(false)
    })

    expect(result.current.open).toBe(false)
  })

  it("ignores setOpen(true) because opening needs a mode", () => {
    const { result } = renderHook(() => useCategoriesSheetState())

    act(() => {
      result.current.setOpen(true)
    })

    expect(result.current.mode).toBe("closed")
  })

  it("keeps the same callbacks across renders", () => {
    const { rerender, result } = renderHook(() => useCategoriesSheetState())
    const first = result.current

    rerender()

    expect(result.current.openCreate).toBe(first.openCreate)
    expect(result.current.openEdit).toBe(first.openEdit)
    expect(result.current).toBe(first)
  })
})

describe("useCategoriesSheet", () => {
  it("throws outside the provider", () => {
    expect(() => renderHook(() => useCategoriesSheet())).toThrow("useCategoriesSheet must be used within CategoriesSheetProvider")
  })

  it("hands the shared sheet api to its consumers", () => {
    const { result: state } = renderHook(() => useCategoriesSheetState())
    const api: CategoriesSheetApi = state.current
    const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
      <CategoriesSheetProvider value={api}>{children}</CategoriesSheetProvider>
    )

    const { result } = renderHook(() => useCategoriesSheet(), { wrapper: Wrapper })

    expect(result.current).toBe(api)
  })
})
