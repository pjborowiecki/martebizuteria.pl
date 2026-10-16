import { type JSX, useCallback, useMemo } from "react"

import { type RowData, type Table } from "@tanstack/react-table"
import { Download } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { TABLE_EXPORT_FORMATS, type TableExportFormat } from "~/src/modules/_core/utils/table-export"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/presentation/components/shadcn/tooltip"

import { useDataGridExport } from "~/src/presentation/components/custom/datagrid/hooks/use-data-grid-export"
import { type DataGridExportSource } from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"

const DataGridExportFormatItem = ({ description, format, onSelect }: Readonly<DataGridExportFormatItemProps>): JSX.Element => {
  const handleClick = useCallback(() => {
    onSelect(format)
  }, [format, onSelect])

  return (
    <DropdownMenuItem className="flex-col items-start gap-0.5" onClick={handleClick}>
      <span className="text-xs font-medium">{format.toUpperCase()}</span>
      <span className="text-[11px] text-muted-foreground">{description}</span>
    </DropdownMenuItem>
  )
}

export const DataGridExport = <TData extends RowData>({ source, table }: Readonly<DataGridExportProps<TData>>): JSX.Element => {
  const t = useTranslations("components.datagrid")
  const { isPending, mutate } = useDataGridExport(table, source)

  const button = useMemo(
    () => (
      <Button variant="outline" size="icon-lg" aria-label={t("export.label")} aria-busy={isPending} disabled={isPending}>
        <Download className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [isPending, t],
  )

  const menuTrigger = useMemo(() => <DropdownMenuTrigger render={button} />, [button])

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger render={menuTrigger} />
        <TooltipContent side="bottom">{t("export.label")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="min-w-64 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("export.menuLabel")}</DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1" />
          {TABLE_EXPORT_FORMATS.map((format) => (
            <DataGridExportFormatItem key={format} description={t(`export.formats.${format}`)} format={format} onSelect={mutate} />
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface DataGridExportFormatItemProps {
  readonly description: string
  readonly format: TableExportFormat
  readonly onSelect: (format: TableExportFormat) => void
}

interface DataGridExportProps<TData extends RowData> {
  readonly source: DataGridExportSource<TData>
  readonly table: Table<DataGridFeatures, TData>
}
