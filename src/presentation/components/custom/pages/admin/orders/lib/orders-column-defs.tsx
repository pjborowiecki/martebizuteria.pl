import { createColumnHelper } from "@tanstack/react-table"
import { type useTranslations } from "use-intl/react"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import {
  ADMIN_ORDER_TABLE_A11Y_KEYS,
  ADMIN_ORDER_TABLE_COLUMN_ID,
  ADMIN_ORDER_TABLE_COLUMN_SIZE,
} from "~/src/modules/order/order.constants"
import { formatAdminOrderDate } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"

import { selectionColumn } from "~/src/presentation/components/custom/datagrid/components/selection-column"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { CATALOG_RECORD_ID_COLUMN_META } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-record-id-column"
import { OrderCustomerCell } from "~/src/presentation/components/custom/pages/admin/orders/components/order-customer-cell"
import { OrderFulfillmentCell } from "~/src/presentation/components/custom/pages/admin/orders/components/order-fulfillment-cell"
import { OrderPaymentBadge } from "~/src/presentation/components/custom/pages/admin/orders/components/order-payment-badge"
import { OrderStatusBadge } from "~/src/presentation/components/custom/pages/admin/orders/components/order-status-badge"
import { OrdersRowActions } from "~/src/presentation/components/custom/pages/admin/orders/components/orders-row-actions"

export const buildOrderColumns = ({ locale, t, tAdmin }: BuildOrderColumnsInput) =>
  columnHelper.columns([
    selectionColumn(columnHelper, {
      all: tAdmin(ADMIN_ORDER_TABLE_A11Y_KEYS.selectAll),
      row: tAdmin(ADMIN_ORDER_TABLE_A11Y_KEYS.selectRow),
    }),
    columnHelper.accessor("id", {
      cell: ({ row }) => <span className="block font-mono text-sm font-medium whitespace-nowrap">{`#${row.original.id}`}</span>,
      enableSorting: false,
      header: t("columns.order"),
      id: ADMIN_ORDER_TABLE_COLUMN_ID.orderId,
      meta: CATALOG_RECORD_ID_COLUMN_META,
      ...fixedDataGridColumnWidth(ADMIN_ORDER_TABLE_COLUMN_SIZE.orderId),
    }),
    columnHelper.accessor("createdAt", {
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap text-muted-foreground">{formatAdminOrderDate(row.original.createdAt, locale)}</span>
      ),
      enableSorting: false,
      filterFn: "auto",
      header: t("columns.date"),
      id: ADMIN_ORDER_TABLE_COLUMN_ID.createdAt,
      maxSize: DATE_COLUMN_MAX_SIZE,
      meta: {
        skeletonVariant: "text",
      },
      size: ADMIN_ORDER_TABLE_COLUMN_SIZE.createdAt,
    }),
    columnHelper.accessor("customerName", {
      cell: ({ row }) => (
        <OrderCustomerCell
          customer={row.original.customerName}
          customerId={row.original.userId ?? ""}
          email={row.original.email}
          initials={row.original.initials}
        />
      ),
      enableSorting: false,
      header: t("columns.customer"),
      id: ADMIN_ORDER_TABLE_COLUMN_ID.customer,
      meta: {
        skeletonVariant: "title",
      },
      size: ADMIN_ORDER_TABLE_COLUMN_SIZE.customer,
    }),
    columnHelper.accessor("email", {
      cell: ({ row }) => <span className="block truncate text-sm text-muted-foreground">{row.original.email}</span>,
      enableSorting: false,
      header: t("columns.email"),
      id: ADMIN_ORDER_TABLE_COLUMN_ID.email,
      meta: {
        skeletonVariant: "text",
      },
      size: ADMIN_ORDER_TABLE_COLUMN_SIZE.email,
    }),
    columnHelper.accessor("itemCount", {
      cell: ({ getValue }) => <span className="block text-center font-mono text-sm text-muted-foreground">{getValue()}</span>,
      enableSorting: false,
      header: t("columns.items"),
      id: ADMIN_ORDER_TABLE_COLUMN_ID.itemCount,
      meta: {
        skeletonVariant: "text",
      },
      size: ADMIN_ORDER_TABLE_COLUMN_SIZE.itemCount,
    }),
    columnHelper.accessor("totalMinorUnits", {
      cell: ({ row }) => (
        <span className="block text-right font-mono text-sm font-medium whitespace-nowrap">
          {formatPrice(row.original.totalMinorUnits, row.original.currencyCode, locale)}
        </span>
      ),
      enableSorting: false,
      filterFn: "auto",
      header: t("columns.total"),
      id: ADMIN_ORDER_TABLE_COLUMN_ID.total,
      meta: {
        skeletonVariant: "text",
      },
      size: ADMIN_ORDER_TABLE_COLUMN_SIZE.total,
    }),
    columnHelper.accessor("fulfillmentUiKey", {
      cell: ({ row }) => <OrderFulfillmentCell fulfillmentUiKey={row.original.fulfillmentUiKey} />,
      enableSorting: false,
      filterFn: "equalsString",
      header: t("columns.fulfillment"),
      id: ADMIN_ORDER_TABLE_COLUMN_ID.fulfillment,
      meta: {
        skeletonVariant: "badge",
      },
      size: ADMIN_ORDER_TABLE_COLUMN_SIZE.fulfillment,
    }),
    columnHelper.accessor("status", {
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      enableSorting: false,
      filterFn: "equalsString",
      header: t("columns.status"),
      id: ADMIN_ORDER_TABLE_COLUMN_ID.status,
      meta: {
        skeletonVariant: "badge",
      },
      size: ADMIN_ORDER_TABLE_COLUMN_SIZE.status,
    }),
    columnHelper.accessor("paymentUiKey", {
      cell: ({ row }) => <OrderPaymentBadge paymentUiKey={row.original.paymentUiKey} />,
      enableSorting: false,
      filterFn: "equalsString",
      header: t("columns.payment"),
      id: ADMIN_ORDER_TABLE_COLUMN_ID.payment,
      meta: {
        skeletonVariant: "badge",
      },
      size: ADMIN_ORDER_TABLE_COLUMN_SIZE.payment,
    }),
    columnHelper.display({
      cell: ({ row }) => <OrdersRowActions order={row.original} />,
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">{t("columns.actions")}</span>,
      id: ADMIN_ORDER_TABLE_COLUMN_ID.actions,
      meta: {
        cellClassName: "pr-4 text-right",
        headClassName: "pr-4",
        preventRowClick: true,
        skeletonVariant: "iconEnd",
      },
      ...fixedDataGridColumnWidth(ADMIN_ORDER_TABLE_COLUMN_SIZE.actions),
    }),
  ])

const columnHelper = createColumnHelper<DataGridFeatures, Order["adminListItem"]>()

const DATE_COLUMN_MAX_SIZE = 320

interface BuildOrderColumnsInput {
  readonly locale: string
  readonly t: ReturnType<typeof useTranslations<"pages.admin.orders">>
  readonly tAdmin: ReturnType<typeof useTranslations<"pages.admin">>
}
