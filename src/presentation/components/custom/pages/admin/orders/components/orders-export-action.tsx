import { type JSX, useCallback, useMemo, useState } from "react"

import { FileSpreadsheet } from "lucide-react"
import { useLocale, useTranslations } from "use-intl/react"

import { downloadCsvFile, escapeCsvField } from "~/src/modules/_core/utils/csv"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import {
  ADMIN_ORDER_FULFILLMENT_LABEL_KEYS,
  ADMIN_ORDER_PAYMENT_LABEL_KEYS,
  ADMIN_ORDER_STATUS_LABEL_KEYS,
  isAdminOrderFulfillmentUiKey,
  isAdminOrderPaymentUiKey,
} from "~/src/modules/order/order.constants"
import { formatAdminOrderDate } from "~/src/modules/order/order.display.utils"
import { exportAdminOrders } from "~/src/modules/order/use-cases/export-admin-orders"

import { Button } from "~/src/presentation/components/shadcn/button"

import { DataGridIconTooltip } from "~/src/presentation/components/custom/datagrid/components/data-grid-icon-tooltip"
import { useOrdersDataGridContext } from "~/src/presentation/components/custom/pages/admin/orders/hooks/use-orders-data-grid"

const resolvePaymentLabel = (paymentUiKey: string, t: ReturnType<typeof useTranslations<"pages.admin.orders">>): string =>
  isAdminOrderPaymentUiKey(paymentUiKey) ? t(ADMIN_ORDER_PAYMENT_LABEL_KEYS[paymentUiKey]) : paymentUiKey

const resolveFulfillmentLabel = (fulfillmentUiKey: string, t: ReturnType<typeof useTranslations<"pages.admin.orders">>): string =>
  isAdminOrderFulfillmentUiKey(fulfillmentUiKey) ? t(ADMIN_ORDER_FULFILLMENT_LABEL_KEYS[fulfillmentUiKey]) : fulfillmentUiKey

export const OrdersExportAction = (): JSX.Element => {
  const t = useTranslations("pages.admin.orders")
  const locale = useLocale()
  const { exportListInput } = useOrdersDataGridContext()
  const [isExporting, setIsExporting] = useState(false)
  const handleExport = useCallback(() => {
    void (async () => {
      setIsExporting(true)
      try {
        const orders = await exportAdminOrders({
          data: exportListInput,
        })

        const headers = ["Order ID", "Customer", "Email", "Date", "Items", "Total", "Payment", "Fulfillment", "Status"]
        const csvContent = [
          headers.join(","),
          ...orders.map((order) => {
            const fields = [
              order.id,
              order.customerName,
              order.email,
              formatAdminOrderDate(order.createdAt, locale),
              String(order.itemCount),
              formatPrice(order.totalMinorUnits, order.currencyCode, locale),
              resolvePaymentLabel(order.paymentUiKey, t),
              resolveFulfillmentLabel(order.fulfillmentUiKey, t),
              t(ADMIN_ORDER_STATUS_LABEL_KEYS[order.status]),
            ]

            return fields.map((field) => `"${escapeCsvField(field)}"`).join(",")
          }),
        ].join("\n")

        downloadCsvFile(`orders-export-${new Date().toISOString().slice(0, ISO_DATE_SLICE_END)}.csv`, csvContent)
      } finally {
        setIsExporting(false)
      }
    })()
  }, [exportListInput, locale, t])

  const button = useMemo(
    () => (
      <Button
        variant="outline"
        size="icon-lg"
        aria-label={t("actions.export")}
        aria-busy={isExporting}
        disabled={isExporting}
        onClick={handleExport}
      >
        <FileSpreadsheet className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [handleExport, isExporting, t],
  )

  return <DataGridIconTooltip label={t("actions.export")} trigger={button} />
}

const ISO_DATE_SLICE_END = 10
