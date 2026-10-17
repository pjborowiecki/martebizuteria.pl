import { type DragEvent, type JSX, type KeyboardEvent, useCallback } from "react"

import { GripVertical } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

import { deliveryMethodsDataGrid } from "~/src/presentation/components/custom/pages/admin/settings/delivery/utils/delivery-methods-data-grid"

export const DeliveryMethodReorderCell = ({ archived, id }: Readonly<{ archived: boolean; id: string }>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery")
  const { rowReorder } = deliveryMethodsDataGrid.useDataGrid()
  const enabled = rowReorder?.enabled === true && !archived
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
        aria-label={t("reorder.handle")}
        className="shrink-0 cursor-grab text-muted-foreground/50 hover:bg-transparent hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed"
        disabled={!enabled}
        draggable={enabled}
        onDragEnd={rowReorder?.onRowDrop}
        onDragStart={handleDragStart}
        onKeyDown={handleKeyDown}
        size="icon"
        type="button"
        variant="ghost"
      >
        <GripVertical className="size-4" strokeWidth={1.5} />
      </Button>
    </div>
  )
}
