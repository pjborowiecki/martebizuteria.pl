import { type JSX, useCallback, useMemo } from "react"

import { ListFilter } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { COLLECTION_STATUS } from "~/src/modules/product-collection/product-collection.constants"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { collectionsDataGrid } from "~/src/presentation/components/custom/pages/admin/catalog/collections/utils/collections-data-grid"

export const CollectionsStatusFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.collections")
  const { table } = collectionsDataGrid.useDataGrid()
  const column = table.getColumn("status")
  const rawFilter = column?.getFilterValue()
  const current = typeof rawFilter === "string" ? rawFilter : ALL_VALUE
  const options = useMemo(
    () => [
      {
        label: t("filter.allStatuses"),
        value: ALL_VALUE,
      },
      {
        label: t("statusActive"),
        value: COLLECTION_STATUS.ACTIVE,
      },
      {
        label: t("statusDraft"),
        value: COLLECTION_STATUS.DRAFT,
      },
    ],
    [t],
  )

  const handleChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return
      }
      column?.setFilterValue(value === ALL_VALUE ? undefined : value)
    },
    [column],
  )

  return (
    <Select items={options} value={current} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="h-9 w-[200px] gap-2 rounded-lg text-xs data-[size=sm]:h-9" aria-label={t("filter.status")}>
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
