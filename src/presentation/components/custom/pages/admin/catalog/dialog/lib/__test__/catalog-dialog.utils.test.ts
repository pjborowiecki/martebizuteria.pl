import { describe, expect, it, vi } from "vite-plus/test"

import { consumeDataGridRowClickSuppression } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { requestCatalogConfirmDialog } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/lib/catalog-dialog.utils"

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

describe("requestCatalogConfirmDialog", () => {
  it("suppresses the row click before the dialog opens", () => {
    requestCatalogConfirmDialog(vi.fn<(open: boolean) => void>())

    expect(consumeDataGridRowClickSuppression()).toBe(true)
  })

  it("defers opening the dialog to a microtask rather than the current tick", async () => {
    const setOpen = vi.fn<(open: boolean) => void>()
    requestCatalogConfirmDialog(setOpen)

    expect(setOpen).not.toHaveBeenCalled()

    await flushMicrotasks()

    expect(setOpen).toHaveBeenCalledExactlyOnceWith(true)
  })

  it("keeps the row click suppressed once the dialog is open", async () => {
    requestCatalogConfirmDialog(vi.fn<(open: boolean) => void>())
    await flushMicrotasks()

    expect(consumeDataGridRowClickSuppression()).toBe(true)
  })
})
