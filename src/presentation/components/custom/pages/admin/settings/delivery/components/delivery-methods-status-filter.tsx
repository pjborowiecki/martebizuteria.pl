import { type JSX, useCallback, useMemo } from "react"

import { ListFilter } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { DELIVERY_METHOD_STATUSES } from "~/src/modules/delivery-method/delivery-method.constants"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { useDeliveryMethodsDataGridContext } from "~/src/presentation/components/custom/pages/admin/settings/delivery/hooks/use-delivery-methods-data-grid"

export const DeliveryMethodsStatusFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery")
  const { activeStatus, applyStatusFilter } = useDeliveryMethodsDataGridContext()
  const options = useMemo(
    () => [
      { label: t("filter.allButArchived"), value: ALL_VALUE },
      ...DELIVERY_METHOD_STATUSES.map((status) => ({ label: t(`status.${status}`), value: status })),
    ],
    [t],
  )

  const handleChange = useCallback(
    (value: string | null) => {
      applyStatusFilter(DELIVERY_METHOD_STATUSES.find((status) => status === value))
    },
    [applyStatusFilter],
  )

  return (
    <Select items={options} onValueChange={handleChange} value={activeStatus ?? ALL_VALUE}>
      <SelectTrigger aria-label={t("filter.status")} className="h-9 w-[200px] gap-2 rounded-lg text-xs data-[size=sm]:h-9" size="sm">
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
