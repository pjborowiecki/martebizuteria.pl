const SHEET_WIDTH_STORAGE_PREFIX = "admin-sheet-width:"

const DEFAULT_SHEET_WIDTH_PX = 512

const MAX_SHEET_WIDTH_PX = 1200

const VIEWPORT_WIDTH_RATIO = 0.9

const SIZE_ROUND_FACTOR = 100

export interface SheetWidthMaxOptions {
  readonly maxWidthPx?: number
  readonly viewportRatio?: number
}

const clampSheetWidth = (width: number, minWidth: number, maxWidth: number): number =>
  Math.round(Math.max(minWidth, Math.min(width, maxWidth)) * SIZE_ROUND_FACTOR) / SIZE_ROUND_FACTOR

export const getMaxSheetWidthPx = (options: SheetWidthMaxOptions = {}): number => {
  const maxCap = options.maxWidthPx ?? MAX_SHEET_WIDTH_PX
  const viewportRatio = options.viewportRatio ?? VIEWPORT_WIDTH_RATIO
  if (typeof innerWidth === "undefined") {
    return maxCap
  }

  return Math.min(maxCap, Math.floor(globalThis.innerWidth * viewportRatio))
}

const readStoredSheetWidth = (persistenceKey: string, minWidthPx: number, maxWidthPx: number): number | undefined => {
  if (typeof localStorage === "undefined") {
    return undefined
  }

  const raw = globalThis.localStorage.getItem(`${SHEET_WIDTH_STORAGE_PREFIX}${persistenceKey}`)
  if (raw === null) {
    return undefined
  }

  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined
  }

  return clampSheetWidth(parsed, minWidthPx, maxWidthPx)
}

export const writeStoredSheetWidth = (persistenceKey: string, width: number): void => {
  if (typeof localStorage === "undefined") {
    return
  }
  globalThis.localStorage.setItem(`${SHEET_WIDTH_STORAGE_PREFIX}${persistenceKey}`, String(width))
}

export const hasStoredSheetWidth = (persistenceKey: string): boolean => {
  if (typeof localStorage === "undefined") {
    return false
  }

  return globalThis.localStorage.getItem(`${SHEET_WIDTH_STORAGE_PREFIX}${persistenceKey}`) !== null
}

export interface ResolveInitialSheetWidthInput {
  readonly persistenceKey: string
  readonly defaultWidthPx?: number
  readonly minWidthPx?: number
  readonly maxOptions?: SheetWidthMaxOptions
}

export const resolveInitialSheetWidth = ({
  persistenceKey,
  defaultWidthPx = DEFAULT_SHEET_WIDTH_PX,
  minWidthPx,
  maxOptions = {},
}: ResolveInitialSheetWidthInput): number => {
  const minWidth = minWidthPx ?? defaultWidthPx
  const maxWidth = getMaxSheetWidthPx(maxOptions)
  const stored = readStoredSheetWidth(persistenceKey, minWidth, maxWidth)
  const initial = clampSheetWidth(defaultWidthPx, minWidth, maxWidth)

  return stored ?? initial
}

interface BindSheetWidthPointerListenersInput {
  readonly maxWidth: number
  readonly minWidth: number
  readonly onEnd: (width: number) => void
  readonly onMove: (width: number) => void
  readonly pointerId: number
  readonly startClientX: number
  readonly startWidth: number
}

export const bindSheetWidthPointerListeners = ({
  maxWidth,
  minWidth,
  onEnd,
  onMove,
  pointerId,
  startClientX,
  startWidth,
}: BindSheetWidthPointerListenersInput): void => {
  const doc = globalThis.document
  const { body } = doc
  const resolveWidth = (clientX: number): number => {
    const delta = startClientX - clientX

    return clampSheetWidth(startWidth + delta, minWidth, maxWidth)
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) {
      return
    }
    event.preventDefault()
    onMove(resolveWidth(event.clientX))
  }

  const stopListening = (event: PointerEvent): void => {
    if (event.pointerId !== pointerId) {
      return
    }
    doc.removeEventListener("pointermove", onPointerMove)
    doc.removeEventListener("pointerup", stopListening)
    doc.removeEventListener("pointercancel", stopListening)
    body.style.removeProperty("cursor")
    body.style.removeProperty("user-select")
    onEnd(resolveWidth(event.clientX))
  }

  const passive = {
    passive: false,
  }
  body.style.cursor = "col-resize"
  body.style.userSelect = "none"
  doc.addEventListener("pointermove", onPointerMove, passive)
  doc.addEventListener("pointerup", stopListening)
  doc.addEventListener("pointercancel", stopListening)
}

export const SHEET_RESIZE_LIMITS = {
  defaultWidthPx: DEFAULT_SHEET_WIDTH_PX,
  maxWidthPx: MAX_SHEET_WIDTH_PX,
  minWidthPx: DEFAULT_SHEET_WIDTH_PX,
} as const
