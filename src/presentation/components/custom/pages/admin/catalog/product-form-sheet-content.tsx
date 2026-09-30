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
    <SheetContent side="right" style={panelStyle} className={cn(PRODUCT_FORM_SHEET_CLASS, className)} {...props}>
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

const PRODUCT_FORM_SHEET_CLASS = cn(
  "flex h-full flex-col gap-0 border-l border-border bg-background p-0 text-foreground shadow-none",
  "data-[side=right]:!w-[var(--catalog-form-sheet-width)] data-[side=right]:!max-w-[var(--catalog-form-sheet-width)]",
)

export const PRODUCT_FORM_SHEET_RESIZE_KEY = "admin.catalog.product-form-sheet"

export const PRODUCT_SHEET_DEFAULT_WIDTH_PX = 1040

const PRODUCT_SHEET_MIN_WIDTH_PX = PRODUCT_SHEET_DEFAULT_WIDTH_PX

const PRODUCT_SHEET_MAX_WIDTH_OPTIONS = {
  maxWidthPx: 2560,
  viewportRatio: 0.98,
} as const

const PRIMARY_MOUSE_BUTTON = 0

type ProductFormSheetContentProps = Omit<ComponentProps<typeof SheetContent>, "side" | "style">
