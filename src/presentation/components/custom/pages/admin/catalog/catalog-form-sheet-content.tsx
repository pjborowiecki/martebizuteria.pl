import { type CSSProperties, type ComponentProps, type JSX, type PointerEvent, useCallback, useMemo, useState } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl"

import {
  SHEET_RESIZE_LIMITS,
  bindSheetWidthPointerListeners,
  getMaxSheetWidthPx,
  hasStoredSheetWidth,
  resolveInitialSheetWidth,
  writeStoredSheetWidth,
} from "~/src/lib/sheet-resize"

import { SheetContent } from "~/src/presentation/components/shadcn/sheet"
const resolveCatalogFormSheetWidth = (): number => {
  if (hasStoredSheetWidth(CATALOG_FORM_SHEET_RESIZE_KEY)) {
    return resolveInitialSheetWidth({
      defaultWidthPx: CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX,
      minWidthPx: CATALOG_FORM_SHEET_MIN_WIDTH_PX,
      persistenceKey: CATALOG_FORM_SHEET_RESIZE_KEY,
    })
  }
  for (const legacyKey of LEGACY_CATALOG_FORM_SHEET_RESIZE_KEYS) {
    if (hasStoredSheetWidth(legacyKey)) {
      const legacyWidth = resolveInitialSheetWidth({
        defaultWidthPx: CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX,
        minWidthPx: CATALOG_FORM_SHEET_MIN_WIDTH_PX,
        persistenceKey: legacyKey,
      })
      writeStoredSheetWidth(CATALOG_FORM_SHEET_RESIZE_KEY, legacyWidth)
      return legacyWidth
    }
  }
  return resolveInitialSheetWidth({
    defaultWidthPx: CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX,
    minWidthPx: CATALOG_FORM_SHEET_MIN_WIDTH_PX,
    persistenceKey: CATALOG_FORM_SHEET_RESIZE_KEY,
  })
}
export const CatalogFormSheetContent = ({ children, className, ...props }: CatalogFormSheetContentProps): JSX.Element => {
  const t = useTranslations("components.shadcn.sheet")
  const [widthPx, setWidthPx] = useState(resolveCatalogFormSheetWidth)
  const panelStyle = useMemo<CSSProperties>(
    () =>
      ({
        "--catalog-form-sheet-width": `${widthPx}px`,
        maxWidth: widthPx,
        minWidth: widthPx,
        width: widthPx,
      }) as CSSProperties,
    [widthPx],
  )
  const handleResizePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== PRIMARY_MOUSE_BUTTON) {
        return
      }
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      const startClientX = event.clientX
      const startWidth = widthPx
      const maxWidth = getMaxSheetWidthPx()
      bindSheetWidthPointerListeners({
        maxWidth,
        minWidth: CATALOG_FORM_SHEET_MIN_WIDTH_PX,
        onEnd: (nextWidth) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
          setWidthPx(nextWidth)
          writeStoredSheetWidth(CATALOG_FORM_SHEET_RESIZE_KEY, nextWidth)
        },
        onMove: setWidthPx,
        pointerId: event.pointerId,
        startClientX,
        startWidth,
      })
    },
    [widthPx],
  )
  return (
    <SheetContent side="right" style={panelStyle} className={cn(CATALOG_FORM_SHEET_CLASS, className)} {...props}>
      <button
        type="button"
        tabIndex={-1}
        aria-label={t("resizePanel")}
        onPointerDown={handleResizePointerDown}
        className="group/sheet-resize absolute top-0 left-0 z-10 flex h-full w-3 -translate-x-1/2 cursor-col-resize touch-none justify-center select-none"
      >
        <div
          className={cn(
            "h-full w-px bg-transparent transition-colors group-hover/sheet-resize:bg-foreground/50 group-active/sheet-resize:w-[2px] group-active/sheet-resize:bg-foreground",
          )}
        />
      </button>
      {children}
    </SheetContent>
  )
}
const CATALOG_FORM_SHEET_CLASS = cn(
  "flex h-full flex-col gap-0 border-l border-border bg-background p-0 text-foreground shadow-none",

  "data-[side=right]:!w-[var(--catalog-form-sheet-width)] data-[side=right]:!max-w-[var(--catalog-form-sheet-width)]",
)
const PRIMARY_MOUSE_BUTTON = 0

export const CATALOG_FORM_SHEET_RESIZE_KEY = "admin.catalog.form-sheet"

/** Sheets can only resize wider than the default. */
export const CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX = SHEET_RESIZE_LIMITS.defaultWidthPx
const CATALOG_FORM_SHEET_MIN_WIDTH_PX = CATALOG_FORM_SHEET_DEFAULT_WIDTH_PX
const LEGACY_CATALOG_FORM_SHEET_RESIZE_KEYS = [
  "admin.catalog.category-sheet",
  "admin.catalog.collection-sheet",
  "admin.catalog.attribute-sheet",
] as const
type CatalogFormSheetContentProps = Omit<ComponentProps<typeof SheetContent>, "side" | "style">
