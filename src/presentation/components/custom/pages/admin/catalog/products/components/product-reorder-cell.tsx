import { type DragEvent, type JSX, type KeyboardEvent, useCallback } from "react"

import { GripVertical } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

import { productsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/products/utils/products-data-grid"

export const ProductReorderCell = ({ id }: ProductReorderCellProps): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const { rowReorder } = productsDataGrid.useDataGrid()
  const enabled = rowReorder?.enabled === true
  const handleDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>) => {
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData("text/plain", id)
      rowReorder?.onRowDragStart(id)
    },
    [id, rowReorder],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowUp") {
        event.preventDefault()
        rowReorder?.onRowMove(id, "up")
      } else if (event.key === "ArrowDown") {
        event.preventDefault()
        rowReorder?.onRowMove(id, "down")
      }
    },
    [id, rowReorder],
  )

  return (
    <div className="flex justify-center">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        draggable={enabled}
        disabled={!enabled}
        onDragStart={handleDragStart}
        onDragEnd={rowReorder?.onRowDrop}
        onKeyDown={handleKeyDown}
        aria-label={t("reorder.handle")}
        className="shrink-0 cursor-grab text-muted-foreground/50 hover:bg-transparent hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed"
      >
        <GripVertical className="size-4" strokeWidth={1.5} />
      </Button>
    </div>
  )
}

interface ProductReorderCellProps {
  readonly id: string
}
