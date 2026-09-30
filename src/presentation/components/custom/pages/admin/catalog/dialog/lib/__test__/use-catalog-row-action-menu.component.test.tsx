import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { consumeDataGridRowClickSuppression } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { useCatalogRowActionMenu } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/lib/use-catalog-row-action-menu"

let clock = new Date("2026-01-01T00:00:00.000Z").getTime()

describe("useCatalogRowActionMenu", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clock += 10_000
    vi.setSystemTime(clock)
  })

  it("starts with the menu closed", () => {
    const { result } = renderHook(() => useCatalogRowActionMenu(false, vi.fn<(open: boolean) => void>()))

    expect(result.current.menuOpen).toBe(false)
  })

  it("opens the menu without suppressing the row click", () => {
    const { result } = renderHook(() => useCatalogRowActionMenu(false, vi.fn<(open: boolean) => void>()))

    act(() => {
      result.current.handleMenuOpenChange(true)
    })

    expect(result.current.menuOpen).toBe(true)
    expect(consumeDataGridRowClickSuppression()).toBe(false)
  })

  it("suppresses the row click when the menu closes so the dismiss does not open the row", () => {
    const { result } = renderHook(() => useCatalogRowActionMenu(false, vi.fn<(open: boolean) => void>()))

    act(() => {
      result.current.handleMenuOpenChange(true)
    })
    act(() => {
      result.current.handleMenuOpenChange(false)
    })

    expect(result.current.menuOpen).toBe(false)
    expect(consumeDataGridRowClickSuppression()).toBe(true)
  })

  it("refuses to reopen the menu while the confirm dialog is up", () => {
    const { result } = renderHook(() => useCatalogRowActionMenu(true, vi.fn<(open: boolean) => void>()))

    act(() => {
      result.current.handleMenuOpenChange(true)
    })

    expect(result.current.menuOpen).toBe(false)
    expect(consumeDataGridRowClickSuppression()).toBe(false)
  })

  it("closes the menu and asks for the confirm dialog on a delete request", () => {
    const setConfirmOpen = vi.fn<(open: boolean) => void>()
    const { result } = renderHook(() => useCatalogRowActionMenu(false, setConfirmOpen))

    act(() => {
      result.current.handleMenuOpenChange(true)
    })
    act(() => {
      result.current.closeMenuAndRequestDeleteConfirm()
    })

    expect(result.current.menuOpen).toBe(false)
    expect(consumeDataGridRowClickSuppression()).toBe(true)
    expect(setConfirmOpen).not.toHaveBeenCalled()
  })

  it("opens the confirm dialog in a microtask after the delete request", async () => {
    const setConfirmOpen = vi.fn<(open: boolean) => void>()
    const { result } = renderHook(() => useCatalogRowActionMenu(false, setConfirmOpen))

    act(() => {
      result.current.closeMenuAndRequestDeleteConfirm()
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(setConfirmOpen).toHaveBeenCalledExactlyOnceWith(true)
  })

  it("forwards a confirm dialog dismissal and closes the menu with it", () => {
    const setConfirmOpen = vi.fn<(open: boolean) => void>()
    const { result } = renderHook(() => useCatalogRowActionMenu(false, setConfirmOpen))

    act(() => {
      result.current.handleMenuOpenChange(true)
    })
    act(() => {
      result.current.handleConfirmOpenChange(false)
    })

    expect(setConfirmOpen).toHaveBeenCalledExactlyOnceWith(false)
    expect(result.current.menuOpen).toBe(false)
    expect(consumeDataGridRowClickSuppression()).toBe(true)
  })

  it("keeps the menu state when the confirm dialog opens", () => {
    const setConfirmOpen = vi.fn<(open: boolean) => void>()
    const { result } = renderHook(() => useCatalogRowActionMenu(false, setConfirmOpen))

    act(() => {
      result.current.handleMenuOpenChange(true)
    })
    act(() => {
      result.current.handleConfirmOpenChange(true)
    })

    expect(setConfirmOpen).toHaveBeenCalledExactlyOnceWith(true)
    expect(result.current.menuOpen).toBe(true)
  })

  it("stops suppressing the row click once the suppression window has passed", () => {
    const { result } = renderHook(() => useCatalogRowActionMenu(false, vi.fn<(open: boolean) => void>()))

    act(() => {
      result.current.handleMenuOpenChange(true)
    })
    act(() => {
      result.current.handleMenuOpenChange(false)
    })
    vi.setSystemTime(clock + 1000)

    expect(consumeDataGridRowClickSuppression()).toBe(false)
  })
})
