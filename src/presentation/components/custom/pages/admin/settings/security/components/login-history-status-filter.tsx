import { type JSX, useMemo } from "react"

import { ListFilter } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { CUSTOMER_ACCOUNT_LOGIN_STATUSES } from "~/src/modules/audit-log/audit-log.constants"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { useLoginHistoryDataGridContext } from "~/src/presentation/components/custom/pages/admin/settings/security/hooks/use-login-history-data-grid"

export const LoginHistoryStatusFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.history")
  const { activeStatus, applyStatusFilter } = useLoginHistoryDataGridContext()
  const options = useMemo(
    () => [
      { label: t("filter.allResults"), value: ALL_VALUE },
      ...CUSTOMER_ACCOUNT_LOGIN_STATUSES.map((status) => ({ label: t(`status.${status}`), value: status })),
    ],
    [t],
  )

  return (
    <Select
      items={options}
      onValueChange={(value) => {
        applyStatusFilter(CUSTOMER_ACCOUNT_LOGIN_STATUSES.find((status) => status === value))
      }}
      value={activeStatus ?? ALL_VALUE}
    >
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
