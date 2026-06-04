import { type DragEvent, type JSX, type KeyboardEvent, useCallback } from "react";

import { GripVertical } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

import { categoriesDataGrid } from "~/src/components/custom/pages/admin/catalog/categories/utils/categories-data-grid";

interface CategoryReorderCellProps {
  readonly id: string;
}

/** Drag handle / keyboard control that reorders a category row by rank. */
export function CategoryReorderCell({ id }: CategoryReorderCellProps): JSX.Element {
  const t = useTranslations("pages.admin.catalog.categories");
  const { rowReorder } = categoriesDataGrid.useDataGrid();
  const enabled = rowReorder?.enabled === true;

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
      rowReorder?.onRowDragStart(id);
    },
    [id, rowReorder]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        rowReorder?.onRowMove(id, "up");
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        rowReorder?.onRowMove(id, "down");
      }
    },
    [id, rowReorder]
  );

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
  );
}
