import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  SHEET_RESIZE_LIMITS,
  bindSheetWidthPointerListeners,
  getMaxSheetWidthPx,
  hasStoredSheetWidth,
  resolveInitialSheetWidth,
  writeStoredSheetWidth,
} from "~/src/presentation/components/custom/pages/admin/catalog/lib/sheet-resize"

const STORAGE_KEY = "admin-sheet-width:products"

const pointerEvent = (type: string, pointerId: number, clientX: number) =>
  Object.assign(new Event(type, { cancelable: true }), { clientX, pointerId })

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal("innerWidth", 4000)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("getMaxSheetWidthPx", () => {
  it("caps the sheet at the hard maximum on a wide screen", () => {
    expect(getMaxSheetWidthPx()).toBe(SHEET_RESIZE_LIMITS.maxWidthPx)
  })

  it("leaves a tenth of a narrow viewport uncovered", () => {
    vi.stubGlobal("innerWidth", 1000)

    expect(getMaxSheetWidthPx()).toBe(900)
  })

  it("floors a fractional viewport share to a whole pixel", () => {
    vi.stubGlobal("innerWidth", 1001)

    expect(getMaxSheetWidthPx()).toBe(900)
  })

  it("honours a caller supplied cap and ratio", () => {
    vi.stubGlobal("innerWidth", 1000)

    expect(getMaxSheetWidthPx({ maxWidthPx: 700, viewportRatio: 0.5 })).toBe(500)
    expect(getMaxSheetWidthPx({ maxWidthPx: 400, viewportRatio: 0.5 })).toBe(400)
  })
})

describe("resolveInitialSheetWidth", () => {
  it("opens at the default width when nothing was stored", () => {
    expect(resolveInitialSheetWidth({ persistenceKey: "products" })).toBe(SHEET_RESIZE_LIMITS.defaultWidthPx)
  })

  it("reopens at the width the admin last dragged to", () => {
    writeStoredSheetWidth("products", 720)

    expect(resolveInitialSheetWidth({ minWidthPx: 320, persistenceKey: "products" })).toBe(720)
  })

  it("clamps a stored width that no longer fits the viewport", () => {
    vi.stubGlobal("innerWidth", 1000)
    writeStoredSheetWidth("products", 1500)

    expect(resolveInitialSheetWidth({ minWidthPx: 320, persistenceKey: "products" })).toBe(900)
  })

  it("clamps a stored width below the minimum back up to it", () => {
    writeStoredSheetWidth("products", 100)

    expect(resolveInitialSheetWidth({ minWidthPx: 320, persistenceKey: "products" })).toBe(320)
  })

  it("rounds a stored width to two decimals", () => {
    writeStoredSheetWidth("products", 700.567)

    expect(resolveInitialSheetWidth({ minWidthPx: 320, persistenceKey: "products" })).toBe(700.57)
  })

  it.each(["not-a-number", "0", "-5", ""])("ignores the unusable stored value %j", (stored) => {
    localStorage.setItem(STORAGE_KEY, stored)

    expect(resolveInitialSheetWidth({ persistenceKey: "products" })).toBe(SHEET_RESIZE_LIMITS.defaultWidthPx)
  })

  it("shrinks a default that is wider than the viewport allows", () => {
    vi.stubGlobal("innerWidth", 600)

    expect(resolveInitialSheetWidth({ defaultWidthPx: 900, minWidthPx: 320, persistenceKey: "products" })).toBe(540)
  })

  it("keeps sheets with different keys independent", () => {
    writeStoredSheetWidth("products", 720)

    expect(resolveInitialSheetWidth({ minWidthPx: 320, persistenceKey: "categories" })).toBe(SHEET_RESIZE_LIMITS.defaultWidthPx)
  })
})

describe("stored sheet width", () => {
  it("writes under a namespaced key so it cannot collide with other preferences", () => {
    writeStoredSheetWidth("products", 640)

    expect(localStorage.getItem(STORAGE_KEY)).toBe("640")
  })

  it("reports whether a sheet was ever resized", () => {
    expect(hasStoredSheetWidth("products")).toBe(false)

    writeStoredSheetWidth("products", 640)

    expect(hasStoredSheetWidth("products")).toBe(true)
    expect(hasStoredSheetWidth("categories")).toBe(false)
  })
})

const drag = (onMove = vi.fn<(width: number) => void>(), onEnd = vi.fn<(width: number) => void>()) => {
  bindSheetWidthPointerListeners({
    maxWidth: 900,
    minWidth: 400,
    onEnd,
    onMove,
    pointerId: 1,
    startClientX: 1000,
    startWidth: 500,
  })

  return { onEnd, onMove }
}

describe("bindSheetWidthPointerListeners", () => {
  it("widens the sheet as the handle is dragged left", () => {
    const { onMove } = drag()

    document.dispatchEvent(pointerEvent("pointermove", 1, 900))

    expect(onMove).toHaveBeenCalledWith(600)
  })

  it("narrows the sheet as the handle is dragged right", () => {
    const { onMove } = drag()

    document.dispatchEvent(pointerEvent("pointermove", 1, 1050))

    expect(onMove).toHaveBeenCalledWith(450)
  })

  it("clamps the drag between the minimum and maximum width", () => {
    const { onMove } = drag()

    document.dispatchEvent(pointerEvent("pointermove", 1, 0))
    document.dispatchEvent(pointerEvent("pointermove", 1, 2000))

    expect(onMove).toHaveBeenNthCalledWith(1, 900)
    expect(onMove).toHaveBeenNthCalledWith(2, 400)
  })

  it("ignores a second pointer touching the screen mid drag", () => {
    const { onEnd, onMove } = drag()

    document.dispatchEvent(pointerEvent("pointermove", 2, 900))
    document.dispatchEvent(pointerEvent("pointerup", 2, 900))

    expect(onMove).not.toHaveBeenCalled()
    expect(onEnd).not.toHaveBeenCalled()
  })

  it("reports the released width and stops listening", () => {
    const { onEnd, onMove } = drag()

    document.dispatchEvent(pointerEvent("pointerup", 1, 900))
    document.dispatchEvent(pointerEvent("pointermove", 1, 800))

    expect(onEnd).toHaveBeenCalledExactlyOnceWith(600)
    expect(onMove).not.toHaveBeenCalled()
  })

  it("ends the drag when the pointer is cancelled", () => {
    const { onEnd } = drag()

    document.dispatchEvent(pointerEvent("pointercancel", 1, 950))

    expect(onEnd).toHaveBeenCalledExactlyOnceWith(550)
  })

  it("shows the resize cursor and suppresses selection only while dragging", () => {
    drag()

    expect(document.body.style.cursor).toBe("col-resize")
    expect(document.body.style.userSelect).toBe("none")

    document.dispatchEvent(pointerEvent("pointerup", 1, 900))

    expect(document.body.style.cursor).toBe("")
    expect(document.body.style.userSelect).toBe("")
  })

  it("prevents the browser from starting a text selection drag", () => {
    drag()
    const event = pointerEvent("pointermove", 1, 900)

    document.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })
})
