import { type JSX, type ReactNode } from "react"

import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import {
  CollectionsSheetProvider,
  useCollectionsSheet,
  useCollectionsSheetState,
} from "~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collections-sheet"

const collection = (overrides: Partial<ProductCollection["adminListItem"]> = {}): ProductCollection["adminListItem"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  descriptions: null,
  handle: "nowosci",
  id: "col-1",
  image: null,
  metadata: null,
  productCount: 4,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  titles: { "en-US": "New arrivals", "pl-PL": "Nowości" },
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
})

afterEach(() => {
  cleanup()
})

describe("useCollectionsSheetState", () => {
  it("starts closed with no collection attached", () => {
    const { result } = renderHook(() => useCollectionsSheetState())

    expect(result.current.mode).toBe("closed")
    expect(result.current.open).toBe(false)
    expect(result.current.collection).toBeUndefined()
  })

  it("opens in create mode without a collection", () => {
    const { result } = renderHook(() => useCollectionsSheetState())

    act(() => {
      result.current.openCreate()
    })

    expect(result.current.mode).toBe("create")
    expect(result.current.open).toBe(true)
    expect(result.current.collection).toBeUndefined()
  })

  it("opens in edit mode carrying the collection to edit", () => {
    const { result } = renderHook(() => useCollectionsSheetState())
    const row = collection()

    act(() => {
      result.current.openEdit(row)
    })

    expect(result.current.mode).toBe("edit")
    expect(result.current.collection).toBe(row)
  })

  it("forgets the collection again when closed", () => {
    const { result } = renderHook(() => useCollectionsSheetState())

    act(() => {
      result.current.openEdit(collection())
    })
    act(() => {
      result.current.close()
    })

    expect(result.current.mode).toBe("closed")
    expect(result.current.collection).toBeUndefined()
  })

  it("closes through setOpen(false) and ignores setOpen(true)", () => {
    const { result } = renderHook(() => useCollectionsSheetState())

    act(() => {
      result.current.setOpen(true)
    })

    expect(result.current.mode).toBe("closed")

    act(() => {
      result.current.openCreate()
    })
    act(() => {
      result.current.setOpen(false)
    })

    expect(result.current.open).toBe(false)
  })

  it("switches straight from editing one collection to creating a new one", () => {
    const { result } = renderHook(() => useCollectionsSheetState())

    act(() => {
      result.current.openEdit(collection())
    })
    act(() => {
      result.current.openCreate()
    })

    expect(result.current.mode).toBe("create")
    expect(result.current.collection).toBeUndefined()
  })
})

describe("useCollectionsSheet", () => {
  it("refuses to be used without the provider", () => {
    expect(() => renderHook(() => useCollectionsSheet())).toThrow("useCollectionsSheet must be used within CollectionsSheetProvider")
  })

  it("hands the shared sheet api down to consumers", () => {
    const outer = renderHook(() => useCollectionsSheetState())
    const wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
      <CollectionsSheetProvider value={outer.result.current}>{children}</CollectionsSheetProvider>
    )
    const inner = renderHook(() => useCollectionsSheet(), { wrapper })

    expect(inner.result.current.mode).toBe("closed")

    act(() => {
      outer.result.current.openCreate()
    })

    expect(outer.result.current.open).toBe(true)
  })
})
