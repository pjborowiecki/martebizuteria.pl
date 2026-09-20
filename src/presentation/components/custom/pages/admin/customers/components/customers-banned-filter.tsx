import { type JSX, useCallback, useMemo } from "react"

import { ListFilter } from "lucide-react"
import { useTranslations } from "use-intl"

import { ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { customersDataGrid } from "~/src/presentation/components/custom/pages/admin/customers/utils/customers-data-grid"
const parseBooleanFilter = (value: string): boolean | undefined => {
  if (value === FILTER_YES) {
    return true
  }
  if (value === FILTER_NO) {
    return false
  }
  return undefined
}

export const CustomersBannedFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.customers")
  const { table } = customersDataGrid.useDataGrid()
  const column = table.getColumn(ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned)
  const rawFilter = column?.getFilterValue()
  const current = typeof rawFilter === "boolean" ? String(rawFilter) : ALL_VALUE
  const options = useMemo(
    () => [
      {
        label: t("filter.allBanned"),
        value: ALL_VALUE,
      },
      {
        label: t("filter.bannedYes"),
        value: FILTER_YES,
      },
      {
        label: t("filter.bannedNo"),
        value: FILTER_NO,
      },
    ],
    [t],
  )
  const handleChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return
      }
      column?.setFilterValue(value === ALL_VALUE ? undefined : parseBooleanFilter(value))
      table.setPageIndex(0)
    },
    [column, table],
  )
  return (
    <Select items={options} value={current} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className="h-9 w-[min(100%,240px)] gap-2 rounded-lg text-xs data-[size=sm]:h-9"
        aria-label={t("filter.banned")}
      >
        <ListFilter className="size-3.5 text-muted-foreground/60" strokeWidth={1.5} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
const ALL_VALUE = "all"
const FILTER_NO = "false"
const FILTER_YES = "true"
