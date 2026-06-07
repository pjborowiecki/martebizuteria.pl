import { type JSX, useCallback, useMemo, useState } from "react";

import { FileSpreadsheet } from "lucide-react";
import { useLocale, useTranslations } from "use-intl";

import { formatPrice } from "~/src/lib/_utils/currency";

import { Button } from "~/src/components/shadcn/button";

import { DataGridIconTooltip } from "~/src/components/custom/datagrid/components/data-grid-icon-tooltip";
import { useOrdersDataGridContext } from "~/src/components/custom/pages/admin/orders/hooks/use-orders-data-grid";

import {
  ADMIN_ORDER_FULFILLMENT_LABEL_KEYS,
  ADMIN_ORDER_PAYMENT_LABEL_KEYS,
  ADMIN_ORDER_STATUS_LABEL_KEYS,
  isAdminOrderFulfillmentUiKey,
  isAdminOrderPaymentUiKey
} from "~/src/modules/order/order.constants";
import { formatAdminOrderDate } from "~/src/modules/order/order.display.utils";
import { orderQueries } from "~/src/modules/order/order.queries";

const ISO_DATE_SLICE_START = 0;
const ISO_DATE_SLICE_END = 10;

function escapeCsvField(value: string): string {
  return value.replaceAll('"', '""');
}

function resolvePaymentLabel(paymentUiKey: string, t: ReturnType<typeof useTranslations<"pages.admin.orders">>): string {
  return isAdminOrderPaymentUiKey(paymentUiKey) ? t(ADMIN_ORDER_PAYMENT_LABEL_KEYS[paymentUiKey]) : paymentUiKey;
}

function resolveFulfillmentLabel(fulfillmentUiKey: string, t: ReturnType<typeof useTranslations<"pages.admin.orders">>): string {
  return isAdminOrderFulfillmentUiKey(fulfillmentUiKey) ? t(ADMIN_ORDER_FULFILLMENT_LABEL_KEYS[fulfillmentUiKey]) : fulfillmentUiKey;
}

export function OrdersExportAction(): JSX.Element {
  const t = useTranslations("pages.admin.orders");
  const locale = useLocale();
  const { exportListInput } = useOrdersDataGridContext();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(() => {
    void (async () => {
      setIsExporting(true);

      try {
        const orders = await orderQueries.fetchAdminOrdersExportFn({ data: exportListInput });
        const headers = ["Order ID", "Customer", "Email", "Date", "Items", "Total", "Payment", "Fulfillment", "Status"];

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
              t(ADMIN_ORDER_STATUS_LABEL_KEYS[order.status])
            ];

            return fields.map((field) => `"${escapeCsvField(field)}"`).join(",");
          })
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `orders-export-${new Date().toISOString().slice(ISO_DATE_SLICE_START, ISO_DATE_SLICE_END)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } finally {
        setIsExporting(false);
      }
    })();
  }, [exportListInput, locale, t]);

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
    [handleExport, isExporting, t]
  );

  return <DataGridIconTooltip label={t("actions.export")} trigger={button} />;
}
