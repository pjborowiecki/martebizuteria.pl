import { type JSX, useCallback, useMemo } from "react"

import { ListFilter } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { DISCOUNT_STATUSES, DISCOUNT_TYPES } from "~/src/modules/discount/discount.constants"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { useCouponsDataGridContext } from "~/src/presentation/components/custom/pages/admin/coupons/hooks/use-coupons-data-grid"

const CouponsFilterSelect = ({ ariaLabel, onValueChange, options, value }: Readonly<CouponsFilterSelectProps>): JSX.Element => (
  <Select items={options} onValueChange={onValueChange} value={value}>
    <SelectTrigger aria-label={ariaLabel} className="h-9 w-[200px] gap-2 rounded-lg text-xs data-[size=sm]:h-9" size="sm">
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

export const CouponsStatusFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.coupons")
  const { activeFilters, applyCouponsFilter } = useCouponsDataGridContext()
  const options = useMemo(
    () => [
      { label: t("filter.allStatuses"), value: ALL_VALUE },
      ...DISCOUNT_STATUSES.map((status) => ({ label: t(`status.${status}`), value: status })),
    ],
    [t],
  )

  const handleChange = useCallback(
    (value: string | null) => {
      applyCouponsFilter({ status: DISCOUNT_STATUSES.find((status) => status === value) })
    },
    [applyCouponsFilter],
  )

  return (
    <CouponsFilterSelect
      ariaLabel={t("filter.status")}
      onValueChange={handleChange}
      options={options}
      value={activeFilters.status ?? ALL_VALUE}
    />
  )
}

export const CouponsTypeFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.coupons")
  const { activeFilters, applyCouponsFilter } = useCouponsDataGridContext()
  const options = useMemo(
    () => [{ label: t("filter.allTypes"), value: ALL_VALUE }, ...DISCOUNT_TYPES.map((type) => ({ label: t(`type.${type}`), value: type }))],
    [t],
  )

  const handleChange = useCallback(
    (value: string | null) => {
      applyCouponsFilter({ type: DISCOUNT_TYPES.find((type) => type === value) })
    },
    [applyCouponsFilter],
  )

  return (
    <CouponsFilterSelect
      ariaLabel={t("filter.type")}
      onValueChange={handleChange}
      options={options}
      value={activeFilters.type ?? ALL_VALUE}
    />
  )
}

const ALL_VALUE = "all"

interface CouponsFilterSelectProps {
  readonly ariaLabel: string
  readonly onValueChange: (value: string | null) => void
  readonly options: readonly { readonly label: string; readonly value: string }[]
  readonly value: string
}
