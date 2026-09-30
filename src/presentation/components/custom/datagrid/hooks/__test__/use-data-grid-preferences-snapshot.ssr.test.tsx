import { type JSX } from "react"
import { renderToString } from "react-dom/server"

import { describe, expect, it, vi } from "vite-plus/test"

import {
  type DataGridPreferencesSnapshotApi,
  useDataGridPreferencesSnapshot,
} from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-preferences-snapshot"
import { bootstrapAllDataGridColumnSizingFromStorage } from "~/src/presentation/components/custom/datagrid/lib/data-grid-preferences-store"

const Preferences = ({ onRead }: Readonly<{ onRead: (api: DataGridPreferencesSnapshotApi) => void }>): JSX.Element => {
  const api = useDataGridPreferencesSnapshot({
    canonicalOrder: ["name", "status", "internal"],
    columnMaxSizes: {},
    columnMinSizes: {},
    defaultColumnVisibility: { status: false },
    forcedHiddenColumnIds: ["internal"],
    lockedColumnIds: [],
    persistenceKey: "ssr.products",
  })
  onRead(api)

  return <output>{api.snapshot.columnOrder.join(",")}</output>
}

describe("server-rendered grid preferences", () => {
  it("renders canonical preferences without browser storage and initializes an isolated server store", () => {
    const onRead = vi.fn<(api: DataGridPreferencesSnapshotApi) => void>()

    expect(renderToString(<Preferences onRead={onRead} />)).toBe("<output>name,status,internal</output>")
    const api = onRead.mock.calls[0]?.[0]
    const store = api?.getStore()

    expect(store?.getSnapshot()).toStrictEqual(api?.snapshot)
    expect(store?.getSnapshot().columnVisibility).toStrictEqual({ internal: false, status: false })
    expect(api?.getStore()).toBe(store)
    const listener = vi.fn<() => void>()
    store?.subscribe(listener)
    store?.setSnapshot({ columnOrder: ["status", "name"], columnSizing: { name: 240 }, columnVisibility: {} })
    expect(listener).toHaveBeenCalledOnce()
    expect(store?.getSnapshot().columnSizing).toStrictEqual({ name: 240 })
  })

  it("can bootstrap server markup without accessing browser storage", () => {
    expect(bootstrapAllDataGridColumnSizingFromStorage).not.toThrow()
  })
})
