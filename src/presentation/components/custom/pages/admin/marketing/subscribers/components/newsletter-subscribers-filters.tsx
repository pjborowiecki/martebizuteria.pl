import { type JSX, useCallback, useMemo } from "react"

import { ListFilter } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { NEWSLETTER_STATUSES } from "~/src/modules/newsletter/newsletter.constants"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { useNewsletterSubscribersDataGridContext } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/hooks/use-newsletter-subscribers-data-grid"

export const NewsletterSubscribersStatusFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.marketing.subscribers")
  const { activeStatus, applyStatusFilter } = useNewsletterSubscribersDataGridContext()
  const options = useMemo(
    () => [
      { label: t("filter.allStatuses"), value: ALL_VALUE },
      ...NEWSLETTER_STATUSES.map((status) => ({ label: t(`status.${status}`), value: status })),
    ],
    [t],
  )

  const handleChange = useCallback(
    (value: string | null) => {
      applyStatusFilter(NEWSLETTER_STATUSES.find((status) => status === value))
    },
    [applyStatusFilter],
  )

  return (
    <Select items={options} onValueChange={handleChange} value={activeStatus ?? ALL_VALUE}>
      <SelectTrigger aria-label={t("filter.status")} className="h-9 w-[220px] gap-2 rounded-lg text-xs data-[size=sm]:h-9" size="sm">
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
