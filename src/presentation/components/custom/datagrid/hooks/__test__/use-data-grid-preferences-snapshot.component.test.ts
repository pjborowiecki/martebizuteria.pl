import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { useDataGridPreferencesSnapshot } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-preferences-snapshot"
import { dataGridPreferencesStorageKey } from "~/src/presentation/components/custom/datagrid/lib/data-grid-preferences"

const CANONICAL_ORDER = ["select", "name", "status", "createdAt"]

const baseOptions = (persistenceKey: string) => ({
  canonicalOrder: CANONICAL_ORDER,
  columnMaxSizes: {},
  columnMinSizes: {},
  lockedColumnIds: [],
  persistenceKey,
})

describe("useDataGridPreferencesSnapshot", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it("falls back to the canonical order when nothing is stored", () => {
    const { result } = renderHook(() => useDataGridPreferencesSnapshot(baseOptions("grid:a")))

    expect(result.current.snapshot.columnOrder).toStrictEqual(CANONICAL_ORDER)
    expect(result.current.snapshot.columnSizing).toStrictEqual({})
  })

  it("applies the default column visibility", () => {
    const { result } = renderHook(() =>
      useDataGridPreferencesSnapshot({ ...baseOptions("grid:b"), defaultColumnVisibility: { createdAt: false } }),
    )

    expect(result.current.snapshot.columnVisibility["createdAt"]).toBe(false)
    expect(result.current.snapshot.columnVisibility["name"]).not.toBe(false)
  })

  it("reads a stored column order back", () => {
    localStorage.setItem(
      dataGridPreferencesStorageKey("grid:c"),
      JSON.stringify({ columnOrder: ["select", "status", "name", "createdAt"] }),
    )

    const { result } = renderHook(() => useDataGridPreferencesSnapshot(baseOptions("grid:c")))

    expect(result.current.snapshot.columnOrder).toStrictEqual(["select", "status", "name", "createdAt"])
  })

  it("reads stored column sizing back", () => {
    localStorage.setItem(dataGridPreferencesStorageKey("grid:d"), JSON.stringify({ columnSizing: { name: 240 } }))

    const { result } = renderHook(() => useDataGridPreferencesSnapshot(baseOptions("grid:d")))

    expect(result.current.snapshot.columnSizing["name"]).toBe(240)
  })

  it("keeps forced hidden columns hidden even when storage says otherwise", () => {
    localStorage.setItem(dataGridPreferencesStorageKey("grid:e"), JSON.stringify({ columnVisibility: { status: true } }))

    const { result } = renderHook(() => useDataGridPreferencesSnapshot({ ...baseOptions("grid:e"), forcedHiddenColumnIds: ["status"] }))

    expect(result.current.snapshot.columnVisibility["status"]).toBe(false)
  })

  it("puts pinned columns first in the order", () => {
    const { result } = renderHook(() =>
      useDataGridPreferencesSnapshot({ ...baseOptions("grid:f"), columnPinning: { end: ["select"], start: ["status"] } }),
    )

    expect(result.current.snapshot.columnOrder.at(0)).toBe("status")
    expect(result.current.snapshot.columnOrder.at(-1)).toBe("select")
  })

  it("hands back the same store while the persistence key does not change", () => {
    const { rerender, result } = renderHook(() => useDataGridPreferencesSnapshot(baseOptions("grid:g")))
    const store = result.current.getStore()

    rerender()

    expect(result.current.getStore()).toBe(store)
  })

  it("re-renders with the store snapshot when the store changes", () => {
    const { result } = renderHook(() => useDataGridPreferencesSnapshot(baseOptions("grid:h")))
    const store = result.current.getStore()

    act(() => {
      store.setSnapshot({ columnOrder: ["name", "select", "status", "createdAt"], columnSizing: { name: 300 }, columnVisibility: {} })
    })

    expect(result.current.snapshot.columnOrder).toStrictEqual(["name", "select", "status", "createdAt"])
    expect(result.current.snapshot.columnSizing["name"]).toBe(300)
  })

  it("ignores unparsable stored preferences", () => {
    localStorage.setItem(dataGridPreferencesStorageKey("grid:i"), "not json")

    const { result } = renderHook(() => useDataGridPreferencesSnapshot(baseOptions("grid:i")))

    expect(result.current.snapshot.columnOrder).toStrictEqual(CANONICAL_ORDER)
  })
})
