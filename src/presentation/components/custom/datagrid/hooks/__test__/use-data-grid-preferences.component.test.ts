import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  type UseDataGridPreferencesOptions,
  useDataGridPreferences,
} from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-preferences"
import { dataGridPreferencesStorageKey } from "~/src/presentation/components/custom/datagrid/lib/data-grid-preferences"

const PERSISTENCE_KEY = "grid:preferences"

const CANONICAL_ORDER = ["select", "name", "status", "createdAt"]

const options: UseDataGridPreferencesOptions = {
  columnMaxSizes: { name: 400 },
  columnMinSizes: { name: 120 },
  initialColumnOrder: CANONICAL_ORDER,
  nonResizableColumnIds: ["select"],
  persistenceKey: PERSISTENCE_KEY,
}

const readStored = (): unknown => {
  const raw = localStorage.getItem(dataGridPreferencesStorageKey(PERSISTENCE_KEY))

  return raw === null ? undefined : JSON.parse(raw)
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe("useDataGridPreferences", () => {
  it("starts from the canonical layout with no overrides", () => {
    const { result } = renderHook(() => useDataGridPreferences(options))

    expect(result.current.columnOrder).toStrictEqual(CANONICAL_ORDER)
    expect(result.current.columnSizing).toStrictEqual({})
    expect(result.current.hasPreferenceOverrides).toBe(false)
  })

  it("does not let a caller mutate the stored order through the array it hands back", () => {
    const { rerender, result } = renderHook(() => useDataGridPreferences(options))

    result.current.columnOrder.push("extra")
    rerender()

    expect(result.current.columnOrder).toStrictEqual(CANONICAL_ORDER)
  })

  it("accepts a new order and reports an override", () => {
    const { result } = renderHook(() => useDataGridPreferences(options))

    act(() => {
      result.current.setColumnOrder(["name", "select", "status", "createdAt"])
    })

    expect(result.current.columnOrder).toStrictEqual(["name", "select", "status", "createdAt"])
    expect(result.current.hasPreferenceOverrides).toBe(true)
  })

  it("accepts an order updater fed with the current order", () => {
    const { result } = renderHook(() => useDataGridPreferences(options))

    act(() => {
      result.current.setColumnOrder((current) => current.toReversed())
    })

    expect(result.current.columnOrder).toStrictEqual(CANONICAL_ORDER.toReversed())
  })

  it("clamps a column width up to its minimum", () => {
    const { result } = renderHook(() => useDataGridPreferences(options))

    act(() => {
      result.current.setColumnSizing({ name: 40 })
    })

    expect(result.current.columnSizing["name"]).toBe(120)
  })

  it("clamps a column width down to its maximum", () => {
    const { result } = renderHook(() => useDataGridPreferences(options))

    act(() => {
      result.current.setColumnSizing({ name: 9000 })
    })

    expect(result.current.columnSizing["name"]).toBe(400)
  })

  it("keeps a width inside its bounds untouched", () => {
    const { result } = renderHook(() => useDataGridPreferences(options))

    act(() => {
      result.current.setColumnSizing({ name: 250 })
    })

    expect(result.current.columnSizing["name"]).toBe(250)
  })

  it("resolves width updaters against the latest state and clamps their result", () => {
    const { result } = renderHook(() => useDataGridPreferences(options))
    act(() => {
      result.current.setColumnSizing({ name: 250 })
    })
    const previousSizing = result.current.columnSizing

    act(() => {
      result.current.setColumnSizing((current) => ({ ...current, name: (current["name"] ?? 0) * 2, select: 500 }))
    })

    expect(result.current.columnSizing).toStrictEqual({ name: 400 })
    expect(previousSizing).toStrictEqual({ name: 250 })
  })

  it("refuses to size a non resizable column", () => {
    const { result } = renderHook(() => useDataGridPreferences(options))

    act(() => {
      result.current.setColumnSizing({ name: 200, select: 500 })
    })

    expect(result.current.columnSizing).toStrictEqual({ name: 200 })
  })

  it("hides a column on request", () => {
    const { result } = renderHook(() => useDataGridPreferences(options))

    act(() => {
      result.current.setColumnVisibility({ status: false })
    })

    expect(result.current.columnVisibility["status"]).toBe(false)
    expect(result.current.hasPreferenceOverrides).toBe(true)
  })

  it("drops visibility entries for columns the grid does not have", () => {
    const { result } = renderHook(() => useDataGridPreferences(options))

    act(() => {
      result.current.setColumnVisibility({ ghost: false })
    })

    expect(result.current.columnVisibility["ghost"]).toBeUndefined()
  })

  it("keeps forced hidden columns hidden however they are toggled", () => {
    const { result } = renderHook(() => useDataGridPreferences({ ...options, forcedHiddenColumnIds: ["createdAt"] }))

    act(() => {
      result.current.setColumnVisibility({ createdAt: true })
    })

    expect(result.current.columnVisibility["createdAt"]).toBe(false)
  })

  it("accepts a visibility updater fed with the current visibility", () => {
    const { result } = renderHook(() => useDataGridPreferences({ ...options, defaultColumnVisibility: { status: false } }))

    act(() => {
      result.current.setColumnVisibility((current) => ({ ...current, status: true }))
    })

    expect(result.current.columnVisibility["status"]).toBe(true)
  })
})

describe("useDataGridPreferences persistence", () => {
  it("cancels a pending write when resetting and keeps forced hidden columns hidden", () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() => useDataGridPreferences({ ...options, forcedHiddenColumnIds: ["createdAt"] }))

      expect(result.current.hasPreferenceOverrides).toBe(false)

      act(() => {
        result.current.setColumnSizing({ name: 250 })
      })
      act(() => {
        result.current.resetPreferences()
        vi.advanceTimersByTime(300)
      })

      expect(result.current.columnSizing).toStrictEqual({})
      expect(result.current.columnVisibility["createdAt"]).toBe(false)
      expect(result.current.hasPreferenceOverrides).toBe(false)
      expect(readStored()).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it("persists the overridden layout after the debounce", () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() => useDataGridPreferences(options))

      act(() => {
        result.current.setColumnOrder(["name", "select", "status", "createdAt"])
      })
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(readStored()).toMatchObject({ columnOrder: ["name", "select", "status", "createdAt"] })
    } finally {
      vi.useRealTimers()
    }
  })

  it("restores the canonical layout and clears storage on reset", () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHook(() => useDataGridPreferences(options))

      act(() => {
        result.current.setColumnOrder(["name", "select", "status", "createdAt"])
      })
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(readStored()).not.toBeUndefined()

      act(() => {
        result.current.resetPreferences()
      })

      expect(result.current.columnOrder).toStrictEqual(CANONICAL_ORDER)
      expect(result.current.hasPreferenceOverrides).toBe(false)
      expect(readStored()).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it("does not write the untouched layout back to storage", () => {
    vi.useFakeTimers()
    try {
      renderHook(() => useDataGridPreferences(options))

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(readStored()).toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it("adopts the layout that was stored for its persistence key", () => {
    localStorage.setItem(
      dataGridPreferencesStorageKey(PERSISTENCE_KEY),
      JSON.stringify({ columnOrder: ["status", "select", "name", "createdAt"], columnSizing: { name: 300 } }),
    )

    const { result } = renderHook(() => useDataGridPreferences(options))

    expect(result.current.columnOrder).toStrictEqual(["status", "select", "name", "createdAt"])
    expect(result.current.columnSizing["name"]).toBe(300)
    expect(result.current.hasPreferenceOverrides).toBe(true)
  })
})
