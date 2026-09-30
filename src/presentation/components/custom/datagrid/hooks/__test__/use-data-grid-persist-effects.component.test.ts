import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { useDataGridPersistEffects } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-persist-effects"
import {
  type DataGridPreferencesSnapshot,
  dataGridPreferencesStorageKey,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-preferences"

const PERSISTENCE_KEY = "grid:persist"

const CANONICAL_ORDER = ["select", "name", "status"]

const REORDERED: DataGridPreferencesSnapshot = {
  columnOrder: ["name", "select", "status"],
  columnSizing: {},
  columnVisibility: {},
}

const CANONICAL: DataGridPreferencesSnapshot = {
  columnOrder: CANONICAL_ORDER,
  columnSizing: {},
  columnVisibility: {},
}

const readStored = (): unknown => {
  const raw = localStorage.getItem(dataGridPreferencesStorageKey(PERSISTENCE_KEY))

  return raw === null ? undefined : JSON.parse(raw)
}

const buildOptions = (snapshot: DataGridPreferencesSnapshot, skipPersist: boolean) => ({
  canonicalOrder: CANONICAL_ORDER,
  columnMaxSizesRef: { current: {} },
  columnPinning: { end: [], start: [] },
  defaultColumnVisibility: {},
  lockedColumnIds: [],
  persistenceKey: PERSISTENCE_KEY,
  skipPersistRef: { current: skipPersist },
  snapshot,
  snapshotRef: { current: snapshot },
})

describe("useDataGridPersistEffects", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    localStorage.clear()
  })

  it("waits for the debounce before writing the snapshot", () => {
    renderHook(() => useDataGridPersistEffects(buildOptions(REORDERED, false)))

    expect(readStored()).toBeUndefined()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(readStored()).toMatchObject({ columnOrder: ["name", "select", "status"] })
  })

  it("skips the first write when the skip flag is set, and clears the flag", () => {
    const options = buildOptions(REORDERED, true)
    renderHook(() => useDataGridPersistEffects(options))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(readStored()).toBeUndefined()
    expect(options.skipPersistRef.current).toBe(false)
  })

  it("cancels the pending write when the hook unmounts", () => {
    const { unmount } = renderHook(() => useDataGridPersistEffects(buildOptions(REORDERED, false)))

    unmount()
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(readStored()).toBeUndefined()
  })

  it("clears stored preferences when the snapshot matches the canonical layout", () => {
    localStorage.setItem(dataGridPreferencesStorageKey(PERSISTENCE_KEY), JSON.stringify(REORDERED))

    renderHook(() => useDataGridPersistEffects(buildOptions(CANONICAL, false)))

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(readStored()).toBeUndefined()
  })

  it("flushes the snapshot when the page is hidden", () => {
    renderHook(() => useDataGridPersistEffects(buildOptions(REORDERED, false)))

    act(() => {
      globalThis.dispatchEvent(new Event("pagehide"))
    })

    expect(readStored()).toMatchObject({ columnOrder: ["name", "select", "status"] })
  })

  it("flushes the snapshot before the page unloads", () => {
    renderHook(() => useDataGridPersistEffects(buildOptions(REORDERED, false)))

    act(() => {
      globalThis.dispatchEvent(new Event("beforeunload"))
    })

    expect(readStored()).toMatchObject({ columnOrder: ["name", "select", "status"] })
  })

  it("stops flushing once the hook has unmounted", () => {
    const { unmount } = renderHook(() => useDataGridPersistEffects(buildOptions(REORDERED, false)))

    unmount()
    act(() => {
      globalThis.dispatchEvent(new Event("pagehide"))
    })

    expect(readStored()).toBeUndefined()
  })

  it("clears the timer handle after the write lands", () => {
    const { result } = renderHook(() => useDataGridPersistEffects(buildOptions(REORDERED, false)))

    expect(result.current.current).not.toBeUndefined()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.current).toBeUndefined()
  })
})
