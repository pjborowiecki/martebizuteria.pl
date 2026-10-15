import { type JSX, useCallback, useMemo, useState } from "react"

import { FileSpreadsheet } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { downloadCsvFile, escapeCsvField } from "~/src/modules/_core/utils/csv"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"
import { exportAdminNewsletterSubscribers } from "~/src/modules/newsletter/use-cases/export-admin-newsletter-subscribers"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"
import { useNewsletterSubscribersDataGridContext } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/hooks/use-newsletter-subscribers-data-grid"

const CSV_HEADERS = ["ID", "Email", "Status", "Language", "Source", "Customer Account ID", "Signed Up", "Confirmed", "Unsubscribed"]

const csvField = (value: string | undefined): string => (value === undefined ? "" : `"${escapeCsvField(value)}"`)

export const NewsletterSubscribersExportAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.marketing.subscribers")
  const tAdmin = useTranslations("pages.admin")
  const format = useFormatter()
  const { exportListInput } = useNewsletterSubscribersDataGridContext()
  const [isExporting, setIsExporting] = useState(false)

  const toCsvRow = useCallback(
    (subscriber: Newsletter["adminListItem"]): string => {
      const formatDate = (value: Date | undefined): string | undefined =>
        value === undefined ? undefined : format.dateTime(value, { dateStyle: "medium" })

      return [
        subscriber.id,
        subscriber.email,
        t(`status.${subscriber.status}`),
        tAdmin(`content.editor.localeNames.${subscriber.locale}`),
        t(`source.${subscriber.source}`),
        subscriber.userId,
        formatDate(subscriber.createdAt),
        formatDate(subscriber.confirmedAt),
        formatDate(subscriber.unsubscribedAt),
      ]
        .map((value) => csvField(value))
        .join(",")
    },
    [format, t, tAdmin],
  )

  const handleExport = useCallback(() => {
    void (async () => {
      setIsExporting(true)
      try {
        const subscribers = await exportAdminNewsletterSubscribers({ data: exportListInput })
        downloadCsvFile(
          "newsletter-subscribers.csv",
          [CSV_HEADERS.join(","), ...subscribers.map((subscriber) => toCsvRow(subscriber))].join("\n"),
        )
      } finally {
        setIsExporting(false)
      }
    })()
  }, [exportListInput, toCsvRow])

  const button = useMemo(
    () => (
      <Button
        aria-busy={isExporting}
        aria-label={t("actions.exportCsv")}
        disabled={isExporting}
        onClick={handleExport}
        size="icon-lg"
        variant="outline"
      >
        <FileSpreadsheet className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [handleExport, isExporting, t],
  )

  return <DataGridIconTooltip label={t("actions.exportCsv")} trigger={button} />
}
