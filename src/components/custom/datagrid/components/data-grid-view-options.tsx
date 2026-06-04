import { type JSX, useCallback, useMemo } from "react";

import type { Column, RowData, Table } from "@tanstack/react-table";
import { Settings2 } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "~/src/components/shadcn/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/components/shadcn/tooltip";

interface DataGridViewOptionsProps<TData extends RowData> {
  readonly table: Table<TData>;
}

function columnLabel<TData extends RowData>(column: Column<TData>): string {
  return typeof column.columnDef.header === "string" ? column.columnDef.header : column.id;
}

function ColumnToggleItem<TData extends RowData>({ column }: Readonly<{ column: Column<TData> }>): JSX.Element {
  const handleChange = useCallback(
    (checked: boolean) => {
      column.toggleVisibility(checked);
    },
    [column]
  );

  return (
    <DropdownMenuCheckboxItem checked={column.getIsVisible()} onCheckedChange={handleChange}>
      {columnLabel(column)}
    </DropdownMenuCheckboxItem>
  );
}

/** Column visibility menu — the toolbar's "View" control. */
export function DataGridViewOptions<TData extends RowData>({ table }: DataGridViewOptionsProps<TData>): JSX.Element {
  const t = useTranslations("components.datagrid");
  const hideableColumns = table.getAllColumns().filter((column) => column.getCanHide());

  const button = useMemo(
    () => (
      <Button variant="outline" size="icon-lg" aria-label={t("view.label")}>
        <Settings2 className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [t]
  );

  const menuTrigger = useMemo(() => <DropdownMenuTrigger render={button} />, [button]);

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger render={menuTrigger} />
        <TooltipContent side="bottom">{t("view.label")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-44 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("view.columns")}</DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1" />
          {hideableColumns.map((column) => (
            <ColumnToggleItem key={column.id} column={column} />
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
