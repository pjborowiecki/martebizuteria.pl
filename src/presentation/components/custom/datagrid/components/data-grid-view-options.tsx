import { type JSX, useCallback, useMemo } from "react"

import { type Column, type RowData, type Table } from "@tanstack/react-table"
import { Settings2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/presentation/components/shadcn/tooltip"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

interface DataGridViewOptionsProps<TData extends RowData> {
  readonly table: Table<DataGridFeatures, TData>
}

const columnLabel = <TData extends RowData>(column: Column<DataGridFeatures, TData>): string =>
  typeof column.columnDef.header === "string" ? column.columnDef.header : column.id

const ColumnToggleItem = <TData extends RowData>({ column }: Readonly<{ column: Column<DataGridFeatures, TData> }>): JSX.Element => {
  const isVisible = column.getIsVisible()

  const handleChange = useCallback(
    (checked: boolean) => {
      if (checked === column.getIsVisible()) {
        return
      }
      column.toggleVisibility(checked)
    },
    [column],
  )

  return (
    <DropdownMenuCheckboxItem checked={isVisible} onCheckedChange={handleChange}>
      {columnLabel(column)}
    </DropdownMenuCheckboxItem>
  )
}

export const DataGridViewOptions = <TData extends RowData>({ table }: DataGridViewOptionsProps<TData>): JSX.Element => {
  const t = useTranslations("components.datagrid")
  const hideableColumns = table.getAllColumns().filter((column) => column.getCanHide())

  const button = useMemo(
    () => (
      <Button variant="outline" size="icon-lg" aria-label={t("view.label")}>
        <Settings2 className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [t],
  )

  const menuTrigger = useMemo(() => <DropdownMenuTrigger render={button} />, [button])

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
  )
}
