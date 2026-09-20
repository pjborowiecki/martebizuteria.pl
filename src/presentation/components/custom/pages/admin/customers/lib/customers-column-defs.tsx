import { type Row, createColumnHelper } from "@tanstack/react-table"
import { type useFormatter, type useTranslations } from "use-intl"

import {
  ADMIN_CUSTOMER_TABLE_A11Y_KEYS,
  ADMIN_CUSTOMER_TABLE_COLUMN_ID,
  ADMIN_CUSTOMER_TABLE_COLUMN_SIZE,
  DEFAULT_ADMIN_CUSTOMER_CURRENCY,
} from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"
import { formatAdminCustomerLocation } from "~/src/modules/user/user.utils"

import { matchesDateColumnFilter } from "~/src/lib/admin-date-filter"
import { formatPrice } from "~/src/lib/currency"

import { selectionColumn } from "~/src/presentation/components/custom/datagrid/components/selection-column"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import {
  CATALOG_RECORD_ID_COLUMN_META,
  catalogRecordIdColumnWidth,
} from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-record-id-column"
import { CatalogTruncatedTextCell } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"
import { CustomerBannedBadge } from "~/src/presentation/components/custom/pages/admin/customers/components/customer-banned-badge"
import { CustomerEmailVerifiedBadge } from "~/src/presentation/components/custom/pages/admin/customers/components/customer-email-verified-badge"
import { CustomerNameCell } from "~/src/presentation/components/custom/pages/admin/customers/components/customer-name-cell"
import { CustomerRoleBadge } from "~/src/presentation/components/custom/pages/admin/customers/components/customer-role-badge"
import {
  CustomerPhoneCell,
  CustomerStripeCustomerIdCell,
} from "~/src/presentation/components/custom/pages/admin/customers/components/customer-table-cells"
import { CustomersRowActions } from "~/src/presentation/components/custom/pages/admin/customers/components/customers-row-actions"
import {
  CUSTOMER_STRIPE_CUSTOMER_ID_COLUMN_META,
  customerStripeCustomerIdColumnWidth,
} from "~/src/presentation/components/custom/pages/admin/customers/lib/customer-stripe-id-column"
import { matchesNumericColumnFilter } from "~/src/presentation/components/custom/pages/admin/customers/lib/customers-numeric-filter"
const matchesBooleanColumnFilter = (row: Row<DataGridFeatures, AdminCustomerRow>, columnId: string, filterValue: unknown): boolean => {
  if (typeof filterValue !== "boolean") {
    return true
  }
  return row.getValue(columnId) === filterValue
}
const matchesBannedColumnFilter = (row: Row<DataGridFeatures, AdminCustomerRow>, columnId: string, filterValue: unknown): boolean => {
  if (typeof filterValue !== "boolean") {
    return true
  }
  return (row.getValue(columnId) === true) === filterValue
}
const buildCustomerProfileColumns = ({ t, tAdmin }: Pick<BuildCustomerColumnsInput, "t" | "tAdmin">) =>
  columnHelper.columns([
    selectionColumn(columnHelper, {
      all: tAdmin(ADMIN_CUSTOMER_TABLE_A11Y_KEYS.selectAll),
      row: tAdmin(ADMIN_CUSTOMER_TABLE_A11Y_KEYS.selectRow),
    }),
    columnHelper.accessor("name", {
      cell: ({ row }) => <CustomerNameCell customer={row.original} />,
      enableSorting: false,
      header: t("columns.customer"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.customer,
      meta: {
        skeletonVariant: "title",
      },
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.customer,
    }),
    columnHelper.accessor((row) => row.id, {
      cell: ({ row }) => <span className="block font-mono text-xs whitespace-nowrap text-muted-foreground">{row.original.id}</span>,
      header: t("columns.id"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.recordId,
      meta: CATALOG_RECORD_ID_COLUMN_META,
      ...catalogRecordIdColumnWidth(),
    }),
    columnHelper.accessor((row) => row.stripeCustomerId ?? "", {
      cell: ({ row }) => <CustomerStripeCustomerIdCell stripeCustomerId={row.original.stripeCustomerId} />,
      header: t("columns.stripeCustomerId"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.stripeCustomerId,
      meta: CUSTOMER_STRIPE_CUSTOMER_ID_COLUMN_META,
      ...customerStripeCustomerIdColumnWidth(),
    }),
    columnHelper.accessor("role", {
      cell: ({ getValue }) => <CustomerRoleBadge role={getValue()} />,
      filterFn: "equalsString",
      header: t("columns.role"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.role,
      meta: {
        skeletonVariant: "badge",
      },
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.role,
    }),
    columnHelper.accessor((row) => row.phone ?? "", {
      cell: ({ row }) => <CustomerPhoneCell phone={row.original.phone} />,
      header: t("columns.phone"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.phone,
      meta: {
        skeletonVariant: "text",
      },
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.phone,
    }),
    columnHelper.accessor("emailVerified", {
      cell: ({ getValue }) => <CustomerEmailVerifiedBadge emailVerified={getValue()} />,
      filterFn: matchesBooleanColumnFilter,
      header: t("columns.emailVerified"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.emailVerified,
      meta: {
        skeletonVariant: "badge",
      },
      minSize: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.emailVerified,
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.emailVerified,
    }),
    columnHelper.accessor("banned", {
      cell: ({ getValue }) => <CustomerBannedBadge banned={getValue() === true} />,
      filterFn: matchesBannedColumnFilter,
      header: t("columns.banned"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.banned,
      meta: {
        skeletonVariant: "badge",
      },
      minSize: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.banned,
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.banned,
    }),
    columnHelper.accessor(
      (row) =>
        formatAdminCustomerLocation(
          row.city === undefined || row.countryCode === undefined
            ? undefined
            : {
                city: row.city,
                countryCode: row.countryCode,
                province: row.province,
              },
        ) ?? "",
      {
        cell: ({ row }) => {
          const location = formatAdminCustomerLocation(
            row.original.city === undefined || row.original.countryCode === undefined
              ? undefined
              : {
                  city: row.original.city,
                  countryCode: row.original.countryCode,
                  province: row.original.province,
                },
          )
          return location === undefined ? <span className={EMPTY_DASH_CLASS}>—</span> : <CatalogTruncatedTextCell text={location} />
        },
        header: t("columns.location"),
        id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.location,
        meta: {
          fillsRemainingWidth: true,
          skeletonVariant: "text",
        },
        minSize: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.location,
        size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.location,
      },
    ),
  ])

const buildCustomerMetricsColumns = ({ format, locale, t }: Pick<BuildCustomerColumnsInput, "format" | "locale" | "t">) =>
  columnHelper.columns([
    columnHelper.accessor("orderCount", {
      cell: ({ getValue }) => <span className="font-mono text-sm tabular-nums">{getValue()}</span>,
      header: t("columns.orders"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.orderCount,
      meta: {
        cellClassName: "text-right",
        headClassName: "text-right",
        skeletonVariant: "number",
      },
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.orderCount,
    }),
    columnHelper.accessor("totalSpent", {
      cell: ({ getValue }) => (
        <span className="block font-mono text-sm font-medium tabular-nums">
          {formatPrice(getValue(), DEFAULT_ADMIN_CUSTOMER_CURRENCY, locale)}
        </span>
      ),
      filterFn: matchesNumericColumnFilter,
      header: t("columns.spent"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent,
      meta: {
        cellClassName: "text-right",
        headClassName: "text-right",
        skeletonVariant: "number",
      },
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.totalSpent,
    }),
    columnHelper.accessor("averageOrderValue", {
      cell: ({ getValue }) => (
        <span className="block font-mono text-sm tabular-nums">{formatPrice(getValue(), DEFAULT_ADMIN_CUSTOMER_CURRENCY, locale)}</span>
      ),
      filterFn: matchesNumericColumnFilter,
      header: t("columns.averageOrderValue"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.averageOrderValue,
      meta: {
        cellClassName: "text-right",
        headClassName: "text-right",
        skeletonVariant: "number",
      },
      minSize: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.averageOrderValue,
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.averageOrderValue,
    }),
    columnHelper.accessor("lastOrderAt", {
      cell: ({ getValue }) => {
        const value = getValue()
        if (value === undefined) {
          return <span className={EMPTY_DASH_CLASS}>—</span>
        }
        return (
          <span className="text-muted-foreground">
            {format.dateTime(new Date(value), {
              dateStyle: "medium",
            })}
          </span>
        )
      },
      filterFn: matchesDateColumnFilter,
      header: t("columns.lastOrder"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.lastOrderAt,
      maxSize: DATE_COLUMN_MAX_SIZE,
      meta: {
        skeletonVariant: "date",
      },
      minSize: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.lastOrderAt,
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.lastOrderAt,
    }),
    columnHelper.accessor("createdAt", {
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {format.dateTime(new Date(getValue()), {
            dateStyle: "medium",
          })}
        </span>
      ),
      filterFn: matchesDateColumnFilter,
      header: t("columns.createdAt"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt,
      maxSize: DATE_COLUMN_MAX_SIZE,
      meta: {
        skeletonVariant: "date",
      },
      minSize: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.createdAt,
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.createdAt,
    }),
    columnHelper.display({
      cell: ({ row }) => <CustomersRowActions customer={row.original} />,
      enableHiding: false,
      enableSorting: false,
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.actions,
      meta: {
        cellClassName: "pr-4 text-right",
        headClassName: "pr-4",
        preventRowClick: true,
        skeletonVariant: "iconEnd",
      },
      ...fixedDataGridColumnWidth(ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.actions),
    }),
  ])

export const buildCustomerColumns = (input: BuildCustomerColumnsInput) =>
  columnHelper.columns([...buildCustomerProfileColumns(input), ...buildCustomerMetricsColumns(input)])

const columnHelper = createColumnHelper<DataGridFeatures, User["adminCustomerListItem"]>()
const DATE_COLUMN_MAX_SIZE = 320
const EMPTY_DASH_CLASS = "text-sm text-muted-foreground/50"
type AdminCustomerRow = User["adminCustomerListItem"]
interface BuildCustomerColumnsInput {
  readonly format: ReturnType<typeof useFormatter>
  readonly locale: string
  readonly t: ReturnType<typeof useTranslations<"pages.admin.customers">>
  readonly tAdmin: ReturnType<typeof useTranslations<"pages.admin">>
}
