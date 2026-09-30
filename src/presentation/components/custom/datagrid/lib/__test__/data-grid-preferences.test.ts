import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  STORAGE_PREFIX,
  clearDataGridPreferences,
  dataGridPreferencesStorageKey,
  defaultPreferencesSnapshot,
  hasDataGridPreferenceOverrides,
  loadDataGridPreferences,
  persistDataGridPreferences,
  prepareDataGridPreferencesSnapshot,
  readDataGridPreferences,
  sameDataGridPreferencesSnapshot,
  sanitizeColumnOrder,
  sanitizeColumnSizing,
  sanitizeColumnVisibility,
  writeDataGridPreferences,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-preferences"

const KEY = "admin.catalog.products:v1"

const canonical = ["select", "title", "status", "minPrice", "actions"]

const createStorage = (): Storage => {
  const entries = new Map<string, string>()

  return {
    clear: () => {
      entries.clear()
    },
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size
    },
    removeItem: (key: string) => {
      entries.delete(key)
    },
    setItem: (key: string, value: string) => {
      entries.set(key, value)
    },
  }
}

describe("dataGridPreferencesStorageKey", () => {
  it("namespaces the key so unrelated grids cannot collide", () => {
    expect(dataGridPreferencesStorageKey(KEY)).toBe(`${STORAGE_PREFIX}${KEY}`)
  })
})

describe("sanitizeColumnOrder", () => {
  it("falls back to the declaration order when nothing was saved", () => {
    expect(sanitizeColumnOrder(undefined, canonical)).toStrictEqual(canonical)
    expect(sanitizeColumnOrder([], canonical)).toStrictEqual(canonical)
  })

  it("keeps the saved order for columns that still exist", () => {
    expect(sanitizeColumnOrder(["title", "select", "status", "minPrice", "actions"], canonical)).toStrictEqual([
      "title",
      "select",
      "status",
      "minPrice",
      "actions",
    ])
  })

  it("drops a saved column that no longer exists", () => {
    expect(sanitizeColumnOrder(["title", "removed", "select"], canonical)).toContain("title")
    expect(sanitizeColumnOrder(["title", "removed", "select"], canonical)).not.toContain("removed")
  })

  it("inserts a newly added column after its declaration-order neighbour", () => {
    expect(sanitizeColumnOrder(["select", "title", "actions"], canonical)).toStrictEqual([
      "select",
      "title",
      "status",
      "minPrice",
      "actions",
    ])
  })

  it("de-duplicates a saved order that repeats a column", () => {
    expect(sanitizeColumnOrder(["title", "title", "select"], canonical).filter((id) => id === "title")).toHaveLength(1)
  })

  it("migrates the legacy record id column key", () => {
    expect(sanitizeColumnOrder(["id", "title"], ["recordId", "title"])).toStrictEqual(["recordId", "title"])
  })

  it("migrates the legacy attribute title column key", () => {
    expect(sanitizeColumnOrder(["handle", "type"], ["title", "type"])).toStrictEqual(["title", "type"])
  })

  it("leaves the legacy key alone when the canonical replacement is absent", () => {
    expect(sanitizeColumnOrder(["id", "title"], ["id", "title"])).toStrictEqual(["id", "title"])
  })

  it("groups pinned columns to the edges whatever the saved order was", () => {
    expect(
      sanitizeColumnOrder(["minPrice", "actions", "title", "select", "status"], canonical, { end: ["actions"], start: ["select"] }),
    ).toStrictEqual(["select", "minPrice", "title", "status", "actions"])
  })

  it("keeps the relative order within each pinning group", () => {
    expect(
      sanitizeColumnOrder(["actions", "status", "select", "title"], canonical, { end: ["actions"], start: ["select", "title"] }),
    ).toStrictEqual(["select", "title", "status", "minPrice", "actions"])
  })

  it("leaves the order alone when nothing is pinned", () => {
    expect(sanitizeColumnOrder(canonical, canonical, {})).toStrictEqual(canonical)
  })
})

describe("sanitizeColumnSizing", () => {
  it("returns nothing when no sizing was saved", () => {
    expect(sanitizeColumnSizing({ columnIds: canonical, saved: undefined })).toStrictEqual({})
  })

  it("keeps a saved width for a resizable column", () => {
    expect(sanitizeColumnSizing({ columnIds: canonical, saved: { title: 240 } })).toStrictEqual({ title: 240 })
  })

  it("drops a saved width for a column that no longer exists", () => {
    expect(sanitizeColumnSizing({ columnIds: canonical, saved: { removed: 240 } })).toStrictEqual({})
  })

  it.each([["select"], ["actions"], ["drag"], ["image"]])("refuses a saved width for the utility column %s", (columnId) => {
    expect(sanitizeColumnSizing({ columnIds: [...canonical, columnId], saved: { [columnId]: 400 } })).toStrictEqual({})
  })

  it("refuses a saved width for an explicitly locked column", () => {
    expect(sanitizeColumnSizing({ columnIds: canonical, lockedColumnIds: ["title"], saved: { title: 400 } })).toStrictEqual({})
  })

  it.each([[0], [-10], [Number.NaN]])("refuses the unusable saved width %j", (size) => {
    expect(sanitizeColumnSizing({ columnIds: canonical, saved: { title: size } })).toStrictEqual({})
  })

  it("clamps a saved width into the column's bounds", () => {
    expect(sanitizeColumnSizing({ columnIds: canonical, columnMinSizes: { title: 120 }, saved: { title: 80 } })).toStrictEqual({
      title: 120,
    })
    expect(sanitizeColumnSizing({ columnIds: canonical, columnMaxSizes: { title: 300 }, saved: { title: 900 } })).toStrictEqual({
      title: 300,
    })
  })

  it("does not carry the legacy attribute slug width over to the renamed title column", () => {
    expect(sanitizeColumnSizing({ columnIds: ["title", "type"], saved: { handle: 90 } })).toStrictEqual({})
  })

  it("migrates the legacy record id width", () => {
    expect(sanitizeColumnSizing({ columnIds: ["recordId", "title"], saved: { id: 300 } })).toStrictEqual({ recordId: 300 })
  })
})

describe("sanitizeColumnVisibility", () => {
  it("keeps a saved boolean for a column that still exists", () => {
    expect(sanitizeColumnVisibility({ columnIds: ["title", "status"], saved: { status: false } })).toStrictEqual({ status: false })
  })

  it("drops a saved entry for a column that no longer exists", () => {
    expect(sanitizeColumnVisibility({ columnIds: ["title"], saved: { removed: false } })).toStrictEqual({})
  })

  it("applies the defaults only where the shopper made no choice", () => {
    expect(
      sanitizeColumnVisibility({ columnIds: ["title", "status"], defaults: { status: false, title: false }, saved: { title: true } }),
    ).toStrictEqual({ status: false, title: true })
  })

  it("forces the configured columns hidden whatever was saved", () => {
    expect(
      sanitizeColumnVisibility({ columnIds: ["title", "status"], forcedHiddenColumnIds: ["status"], saved: { status: true } }),
    ).toStrictEqual({ status: false })
  })

  it("always keeps the utility columns visible", () => {
    expect(sanitizeColumnVisibility({ columnIds: ["select", "actions"], saved: { actions: false, select: false } })).toStrictEqual({
      actions: true,
      select: true,
    })
  })

  it("ignores defaults and forced entries for unknown columns", () => {
    expect(sanitizeColumnVisibility({ columnIds: ["title"], defaults: { ghost: false }, forcedHiddenColumnIds: ["ghost"] })).toStrictEqual(
      {},
    )
  })
})

describe("hasDataGridPreferenceOverrides", () => {
  const defaults = defaultPreferencesSnapshot(canonical)

  it("is false for the default layout", () => {
    expect(hasDataGridPreferenceOverrides({ canonicalOrder: canonical, current: defaults })).toBe(false)
  })

  it("is true once the order differs", () => {
    expect(
      hasDataGridPreferenceOverrides({
        canonicalOrder: canonical,
        current: { ...defaults, columnOrder: ["title", ...canonical.filter((id) => id !== "title")] },
      }),
    ).toBe(true)
  })

  it("is true once any column has been resized", () => {
    expect(hasDataGridPreferenceOverrides({ canonicalOrder: canonical, current: { ...defaults, columnSizing: { title: 240 } } })).toBe(true)
  })

  it("is true once a column's visibility differs from its default", () => {
    expect(
      hasDataGridPreferenceOverrides({
        canonicalOrder: canonical,
        current: { ...defaults, columnVisibility: { ...defaults.columnVisibility, status: false } },
      }),
    ).toBe(true)
  })

  it("is false when a hidden-by-default column is still hidden", () => {
    const withDefault = defaultPreferencesSnapshot(canonical, { status: false })

    expect(
      hasDataGridPreferenceOverrides({ canonicalOrder: canonical, current: withDefault, defaultColumnVisibility: { status: false } }),
    ).toBe(false)
  })
})

describe("prepareDataGridPreferencesSnapshot", () => {
  it("strips widths for locked columns before they are persisted", () => {
    const prepared = prepareDataGridPreferencesSnapshot(
      { columnOrder: canonical, columnSizing: { select: 400, title: 240 }, columnVisibility: {} },
      ["select"],
    )

    expect(prepared.columnSizing).toStrictEqual({ title: 240 })
  })
})

describe("sameDataGridPreferencesSnapshot", () => {
  const snapshot = { columnOrder: ["a", "b"], columnSizing: { a: 100 }, columnVisibility: { a: true } }

  it("is true for an equal snapshot", () => {
    expect(sameDataGridPreferencesSnapshot(snapshot, { ...snapshot })).toBe(true)
  })

  it.each([
    [{ columnOrder: ["b", "a"] }],
    [{ columnSizing: { a: 200 } }],
    [{ columnSizing: { a: 100, b: 100 } }],
    [{ columnVisibility: { a: false } }],
    [{ columnVisibility: {} }],
  ])("is false once %j differs", (overrides) => {
    expect(sameDataGridPreferencesSnapshot(snapshot, { ...snapshot, ...overrides })).toBe(false)
  })
})

describe("storage round trip", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reads nothing back before anything was written", () => {
    expect(readDataGridPreferences(KEY)).toBeUndefined()
  })

  it("reads back what it wrote", () => {
    const snapshot = { columnOrder: canonical, columnSizing: { title: 240 }, columnVisibility: { status: false } }
    writeDataGridPreferences(KEY, snapshot)

    expect(readDataGridPreferences(KEY)).toStrictEqual(snapshot)
  })

  it.each([["{not json"], ['"a string"'], ["null"], [""]])("reads nothing back from the corrupt entry %j", (raw) => {
    localStorage.setItem(dataGridPreferencesStorageKey(KEY), raw)

    expect(readDataGridPreferences(KEY)).toBeUndefined()
  })

  it("forgets the entry when preferences are cleared", () => {
    writeDataGridPreferences(KEY, { columnOrder: canonical, columnSizing: {}, columnVisibility: {} })
    clearDataGridPreferences(KEY, canonical)

    expect(readDataGridPreferences(KEY)).toBeUndefined()
  })

  it("restores the sanitized default layout when nothing is stored", () => {
    expect(loadDataGridPreferences({ canonicalOrder: canonical, persistenceKey: KEY })).toStrictEqual(defaultPreferencesSnapshot(canonical))
  })

  it("restores and sanitizes what was stored", () => {
    writeDataGridPreferences(KEY, {
      columnOrder: ["title", "select", "status", "minPrice", "actions"],
      columnSizing: { select: 400, title: 900 },
      columnVisibility: { status: false },
    })

    const loaded = loadDataGridPreferences({
      canonicalOrder: canonical,
      columnMaxSizes: { title: 300 },
      persistenceKey: KEY,
    })

    expect(loaded.columnSizing).toStrictEqual({ title: 300 })
    expect(loaded.columnVisibility["status"]).toBe(false)
    expect(loaded.columnOrder[0]).toBe("title")
  })

  it("clears the stored entry when the layout returns to the defaults", () => {
    writeDataGridPreferences(KEY, { columnOrder: canonical, columnSizing: { title: 240 }, columnVisibility: {} })

    persistDataGridPreferences({ canonicalOrder: canonical, persistenceKey: KEY, snapshot: defaultPreferencesSnapshot(canonical) })

    expect(readDataGridPreferences(KEY)).toBeUndefined()
  })

  it("writes the entry once the layout differs from the defaults", () => {
    persistDataGridPreferences({
      canonicalOrder: canonical,
      persistenceKey: KEY,
      snapshot: { ...defaultPreferencesSnapshot(canonical), columnSizing: { title: 240 } },
    })

    expect(readDataGridPreferences(KEY)?.columnSizing).toStrictEqual({ title: 240 })
  })

  it("does not persist a width for a locked column even when the caller passes one", () => {
    persistDataGridPreferences({
      canonicalOrder: canonical,
      lockedColumnIds: ["select"],
      persistenceKey: KEY,
      snapshot: { ...defaultPreferencesSnapshot(canonical), columnSizing: { select: 400 } },
    })

    expect(readDataGridPreferences(KEY)).toBeUndefined()
  })

  it("survives a storage that refuses to write", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new Error("QuotaExceededError")
      },
    })

    expect(() => {
      writeDataGridPreferences(KEY, { columnOrder: canonical, columnSizing: {}, columnVisibility: {} })
    }).not.toThrow()
  })

  it("survives a storage that refuses to read", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError")
      },
    })

    expect(readDataGridPreferences(KEY)).toBeUndefined()
  })

  it("reads nothing on a runtime with no storage at all", () => {
    vi.stubGlobal("localStorage", undefined)

    expect(readDataGridPreferences(KEY)).toBeUndefined()
  })
})
