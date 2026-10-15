import { type CSSProperties, type ComponentProps, type JSX, type PointerEvent, useCallback, useMemo, useState } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { SheetContent } from "~/src/presentation/components/shadcn/sheet"

import {
  bindSheetWidthPointerListeners,
  getMaxSheetWidthPx,
  resolveInitialSheetWidth,
  writeStoredSheetWidth,
} from "~/src/presentation/components/custom/pages/admin/catalog/lib/sheet-resize"
import {
  CATALOG_SHEET_PANEL_CLASS,
  CATALOG_SHEET_RESIZE_HANDLE_CLASS,
  CATALOG_SHEET_RESIZE_LINE_CLASS,
} from "~/src/presentation/components/custom/pages/admin/catalog/lib/sheet-resize.styles"

const resolveProductFormSheetWidth = (): number =>
  resolveInitialSheetWidth({
    defaultWidthPx: PRODUCT_SHEET_DEFAULT_WIDTH_PX,
    maxOptions: PRODUCT_SHEET_MAX_WIDTH_OPTIONS,
    minWidthPx: PRODUCT_SHEET_MIN_WIDTH_PX,
    persistenceKey: PRODUCT_FORM_SHEET_RESIZE_KEY,
  })

export const ProductFormSheetContent = ({ children, className, ...props }: ProductFormSheetContentProps): JSX.Element => {
  const t = useTranslations("components.shadcn.sheet")
  const [widthPx, setWidthPx] = useState(resolveProductFormSheetWidth)
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
      const resizeHandle = event.currentTarget
      const { pointerId } = event
      resizeHandle.setPointerCapture(pointerId)
      const startClientX = event.clientX
      const startWidth = widthPx
      const maxWidth = getMaxSheetWidthPx(PRODUCT_SHEET_MAX_WIDTH_OPTIONS)
      bindSheetWidthPointerListeners({
        maxWidth,
        minWidth: PRODUCT_SHEET_MIN_WIDTH_PX,
        onEnd: (nextWidth) => {
          if (resizeHandle.hasPointerCapture(pointerId)) {
            resizeHandle.releasePointerCapture(pointerId)
          }
          setWidthPx(nextWidth)
          writeStoredSheetWidth(PRODUCT_FORM_SHEET_RESIZE_KEY, nextWidth)
        },
        onMove: setWidthPx,
        pointerId,
        startClientX,
        startWidth,
      })
    },
    [widthPx],
  )

  return (
    <SheetContent side="right" style={panelStyle} className={cn(CATALOG_SHEET_PANEL_CLASS, className)} {...props}>
      <button
        type="button"
        tabIndex={-1}
        aria-label={t("resizePanel")}
        onPointerDown={handleResizePointerDown}
        className={cn(CATALOG_SHEET_RESIZE_HANDLE_CLASS, "lg:flex")}
      >
        <div className={CATALOG_SHEET_RESIZE_LINE_CLASS} />
      </button>
      {children}
    </SheetContent>
  )
}

export const PRODUCT_FORM_SHEET_RESIZE_KEY = "admin.catalog.product-form-sheet"

export const PRODUCT_SHEET_DEFAULT_WIDTH_PX = 1040

const PRODUCT_SHEET_MIN_WIDTH_PX = PRODUCT_SHEET_DEFAULT_WIDTH_PX

const PRODUCT_SHEET_MAX_WIDTH_OPTIONS = {
  maxWidthPx: 2560,
  viewportRatio: 0.98,
} as const

const PRIMARY_MOUSE_BUTTON = 0

type ProductFormSheetContentProps = Omit<ComponentProps<typeof SheetContent>, "side" | "style">
