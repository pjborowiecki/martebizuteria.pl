import { type JSX, useCallback, useMemo } from "react"

import { ListFilter } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ADMIN_CUSTOMER_ROLE_LABEL_KEYS, ADMIN_CUSTOMER_TABLE_COLUMN_ID } from "~/src/modules/user/user.constants"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { customersDataGrid } from "~/src/presentation/components/custom/pages/admin/customers/utils/customers-data-grid"

export const CustomersRoleFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.customers")
  const { table } = customersDataGrid.useDataGrid()
  const column = table.getColumn(ADMIN_CUSTOMER_TABLE_COLUMN_ID.role)
  const rawFilter = column?.getFilterValue()
  const current = typeof rawFilter === "string" ? rawFilter : ALL_VALUE
  const options = useMemo(
    () => [
      {
        label: t("filter.allRoles"),
        value: ALL_VALUE,
      },
      {
        label: t(ADMIN_CUSTOMER_ROLE_LABEL_KEYS.customer),
        value: ROLES.CUSTOMER,
      },
      {
        label: t(ADMIN_CUSTOMER_ROLE_LABEL_KEYS.admin),
        value: ROLES.ADMIN,
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
      table.setPageIndex(0)
    },
    [column, table],
  )

  return (
    <Select items={options} value={current} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="h-9 w-[200px] gap-2 rounded-lg text-xs data-[size=sm]:h-9" aria-label={t("filter.role")}>
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
