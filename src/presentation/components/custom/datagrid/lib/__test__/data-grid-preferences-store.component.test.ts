import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { dataGridColumnWidthCssVar } from "~/src/presentation/components/custom/datagrid/lib/data-grid-column-width"
import { type DataGridPreferencesSnapshot } from "~/src/presentation/components/custom/datagrid/lib/data-grid-preferences"
import {
  bootstrapAllDataGridColumnSizingFromStorage,
  createDataGridPreferencesStore,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-preferences-store"

const CANONICAL_ORDER = ["select", "title", "handle", "actions"]

const PERSISTENCE_KEY = "admin.customers"

const STORAGE_KEY = `marte:datagrid:v1:${PERSISTENCE_KEY}`

const snapshot = (overrides: Partial<DataGridPreferencesSnapshot> = {}): DataGridPreferencesSnapshot => ({
  columnOrder: CANONICAL_ORDER,
  columnSizing: {},
  columnVisibility: {},
  ...overrides,
})

const createStore = (initialSnapshot?: DataGridPreferencesSnapshot) =>
  createDataGridPreferencesStore({
    canonicalOrder: CANONICAL_ORDER,
    columnMaxSizes: { title: 400 },
    columnMinSizes: { title: 120 },
    lockedColumnIds: [],
    persistenceKey: PERSISTENCE_KEY,
    ...(initialSnapshot === undefined ? {} : { initialSnapshot }),
  })

const readCssVar = (persistenceKey: string, columnId: string) =>
  document.documentElement.style.getPropertyValue(dataGridColumnWidthCssVar(persistenceKey, columnId))

describe("createDataGridPreferencesStore", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("style")
  })

  it("starts from the canonical order when no snapshot is supplied", () => {
    expect(createStore().getSnapshot().columnOrder).toStrictEqual(CANONICAL_ORDER)
  })

  it("keeps the supplied snapshot as the first readable state", () => {
    const initial = snapshot({ columnSizing: { title: 240 } })

    expect(createStore(initial).getSnapshot()).toStrictEqual(initial)
  })

  it("notifies subscribers and stores the new snapshot", () => {
    const store = createStore()
    const listener = vi.fn<() => void>()
    store.subscribe(listener)

    const next = snapshot({ columnSizing: { title: 240 } })
    store.setSnapshot(next)

    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot()).toStrictEqual(next)
  })

  it("ignores a snapshot whose contents match the current one", () => {
    const store = createStore()
    const listener = vi.fn<() => void>()
    store.subscribe(listener)

    store.setSnapshot({ ...store.getSnapshot() })

    expect(listener).not.toHaveBeenCalled()
  })

  it("notifies every subscriber", () => {
    const store = createStore()
    const first = vi.fn<() => void>()
    const second = vi.fn<() => void>()
    store.subscribe(first)
    store.subscribe(second)

    store.setSnapshot(snapshot({ columnVisibility: { handle: false } }))

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it("stops notifying a listener once it unsubscribes", () => {
    const store = createStore()
    const listener = vi.fn<() => void>()
    const unsubscribe = store.subscribe(listener)
    unsubscribe()

    store.setSnapshot(snapshot({ columnSizing: { title: 240 } }))

    expect(listener).not.toHaveBeenCalled()
  })

  it("publishes the new widths as css custom properties, capped at the column maximum", () => {
    const store = createStore()

    store.setSnapshot(snapshot({ columnSizing: { handle: 180, title: 900 } }))

    expect(readCssVar(PERSISTENCE_KEY, "title")).toBe("400px")
    expect(readCssVar(PERSISTENCE_KEY, "handle")).toBe("180px")
  })

  it("clears the css custom property of a column that returns to its design width", () => {
    const store = createStore(snapshot({ columnSizing: { title: 240 } }))
    store.setSnapshot(snapshot({ columnSizing: { title: 240 } }))
    store.setSnapshot(snapshot({ columnSizing: {} }))

    expect(readCssVar(PERSISTENCE_KEY, "title")).toBe("")
  })
})

describe("bootstrapAllDataGridColumnSizingFromStorage", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute("style")
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute("style")
  })

  it("republishes the widths saved for every grid", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ columnOrder: CANONICAL_ORDER, columnSizing: { title: 240 } }))
    localStorage.setItem("marte:datagrid:v1:admin.orders", JSON.stringify({ columnOrder: ["total"], columnSizing: { total: 150 } }))

    bootstrapAllDataGridColumnSizingFromStorage()

    expect(readCssVar(PERSISTENCE_KEY, "title")).toBe("240px")
    expect(readCssVar("admin.orders", "total")).toBe("150px")
  })

  it("ignores storage keys that belong to other features", () => {
    localStorage.setItem("marte:theme", JSON.stringify({ columnSizing: { title: 240 } }))

    bootstrapAllDataGridColumnSizingFromStorage()

    expect(document.documentElement.getAttribute("style")).toBeNull()
  })

  it("falls back to the saved sizing keys when no column order was stored", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ columnSizing: { title: 240 } }))

    bootstrapAllDataGridColumnSizingFromStorage()

    expect(readCssVar(PERSISTENCE_KEY, "title")).toBe("240px")
  })

  it("accepts an empty preference object without creating any column widths", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({}))

    bootstrapAllDataGridColumnSizingFromStorage()

    expect(document.documentElement.getAttribute("style")).toBeNull()
  })

  it("can render a grid when the browser provides no local storage", () => {
    vi.stubGlobal("localStorage", undefined)
    try {
      expect(bootstrapAllDataGridColumnSizingFromStorage).not.toThrow()
      expect(document.documentElement.getAttribute("style")).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("refuses to restore a width for a utility column", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ columnOrder: CANONICAL_ORDER, columnSizing: { actions: 200, select: 120 } }))

    bootstrapAllDataGridColumnSizingFromStorage()

    expect(readCssVar(PERSISTENCE_KEY, "select")).toBe("")
    expect(readCssVar(PERSISTENCE_KEY, "actions")).toBe("")
  })

  it("clamps a stored width to the shared maximum", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ columnOrder: CANONICAL_ORDER, columnSizing: { title: 5000 } }))

    bootstrapAllDataGridColumnSizingFromStorage()

    expect(readCssVar(PERSISTENCE_KEY, "title")).toBe("720px")
  })

  it("survives a corrupted entry without publishing anything", () => {
    localStorage.setItem(STORAGE_KEY, "{not json")

    bootstrapAllDataGridColumnSizingFromStorage()

    expect(document.documentElement.getAttribute("style")).toBeNull()
  })
})
