import { type ComponentProps, type CSSProperties, type JSX, type PointerEvent, useCallback, useMemo, useState } from "react";

import { useTranslations } from "use-intl";

import {
  bindSheetWidthPointerListeners,
  getMaxSheetWidthPx,
  resolveInitialSheetWidth,
  writeStoredSheetWidth
} from "~/src/lib/sheet-resize";
import { cn } from "~/src/lib/utils";

import { SheetContent } from "~/src/components/shadcn/sheet";

const PRODUCT_FORM_SHEET_CLASS = cn(
  "flex h-full flex-col gap-0 border-l border-border bg-background p-0 text-foreground shadow-none",
  "data-[side=right]:!w-[var(--catalog-form-sheet-width)] data-[side=right]:!max-w-[var(--catalog-form-sheet-width)]"
);

/** Wider default than category/collection sheets — product forms have more fields. */
export const PRODUCT_FORM_SHEET_RESIZE_KEY = "admin.catalog.product-form-sheet";

/** Default width — two-column body layout needs ~960px+ to sit side by side comfortably. */
export const PRODUCT_SHEET_DEFAULT_WIDTH_PX = 1040;
/** Same as default — product sheet may only be resized wider. */
const PRODUCT_SHEET_MIN_WIDTH_PX = PRODUCT_SHEET_DEFAULT_WIDTH_PX;

/** Wider cap than category/collection sheets — room for two-column product layout on large monitors. */
const PRODUCT_SHEET_MAX_WIDTH_OPTIONS = {
  maxWidthPx: 2560,
  viewportRatio: 0.98
} as const;

const PRIMARY_MOUSE_BUTTON = 0;

function resolveProductFormSheetWidth(): number {
  return resolveInitialSheetWidth({
    defaultWidthPx: PRODUCT_SHEET_DEFAULT_WIDTH_PX,
    maxOptions: PRODUCT_SHEET_MAX_WIDTH_OPTIONS,
    minWidthPx: PRODUCT_SHEET_MIN_WIDTH_PX,
    persistenceKey: PRODUCT_FORM_SHEET_RESIZE_KEY
  });
}

type ProductFormSheetContentProps = Omit<ComponentProps<typeof SheetContent>, "side" | "style">;

export function ProductFormSheetContent({ children, className, ...props }: ProductFormSheetContentProps): JSX.Element {
  const t = useTranslations("components.shadcn.sheet");
  const [widthPx, setWidthPx] = useState(resolveProductFormSheetWidth);
  const panelStyle = useMemo<CSSProperties>(
    () =>
      ({
        "--catalog-form-sheet-width": `${widthPx}px`,
        maxWidth: widthPx,
        minWidth: widthPx,
        width: widthPx
      }) as CSSProperties,
    [widthPx]
  );

  const handleResizePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== PRIMARY_MOUSE_BUTTON) {
        return;
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const startClientX = event.clientX;
      const startWidth = widthPx;
      const maxWidth = getMaxSheetWidthPx(PRODUCT_SHEET_MAX_WIDTH_OPTIONS);

      bindSheetWidthPointerListeners({
        maxWidth,
        minWidth: PRODUCT_SHEET_MIN_WIDTH_PX,
        onEnd: (nextWidth) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          setWidthPx(nextWidth);
          writeStoredSheetWidth(PRODUCT_FORM_SHEET_RESIZE_KEY, nextWidth);
        },
        onMove: setWidthPx,
        pointerId: event.pointerId,
        startClientX,
        startWidth
      });
    },
    [widthPx]
  );

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
            "h-full w-px bg-transparent transition-colors group-hover/sheet-resize:bg-foreground/50 group-active/sheet-resize:w-[2px] group-active/sheet-resize:bg-foreground"
          )}
        />
      </button>
      {children}
    </SheetContent>
  );
}
