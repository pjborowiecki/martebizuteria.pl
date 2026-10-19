import { useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { type Newsletter } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"
import { exportAdminNewsletterSubscribers } from "~/src/modules/newsletter-subscriber/use-cases/export-admin-newsletter-subscribers"

import { type DataGridExportSource, exportFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"

export const NEWSLETTER_SUBSCRIBERS_EXPORT_LIST = "newsletter-subscribers"

export const useNewsletterSubscribersExportSource = (
  input: Newsletter["adminExportInput"],
): DataGridExportSource<Newsletter["adminListItem"]> => {
  const t = useTranslations("pages.admin.marketing.subscribers")

  return useMemo(
    () => ({
      filters: exportFilter(t("columns.status"), input.status === undefined ? undefined : t(`status.${input.status}`)),
      list: NEWSLETTER_SUBSCRIBERS_EXPORT_LIST,
      loadRows: () => exportAdminNewsletterSubscribers({ data: input }),
      search: input.search,
      title: t("title"),
    }),
    [input, t],
  )
}
