import { type Row, createColumnHelper } from "@tanstack/react-table"
import { type useTranslations } from "use-intl/react"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import {
  ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS,
  ADMIN_CUSTOMER_ROLE_LABEL_KEYS,
  ADMIN_CUSTOMER_TABLE_A11Y_KEYS,
  ADMIN_CUSTOMER_TABLE_COLUMN_ID,
  ADMIN_CUSTOMER_TABLE_COLUMN_SIZE,
  DEFAULT_ADMIN_CUSTOMER_CURRENCY,
} from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"
import { formatAdminCustomerLocation } from "~/src/modules/user/user.utils"

import { type useFormatter } from "~/src/hooks/use-display-format"

import { selectionColumn } from "~/src/presentation/components/custom/datagrid/components/selection-column"
import { matchesDateColumnFilterIn } from "~/src/presentation/components/custom/datagrid/lib/data-grid-date-filter"
import { matchesNumericColumnFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-numeric-filter"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { CATALOG_RECORD_ID_COLUMN_META } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-record-id-column"
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

const resolveCustomerLocation = (row: AdminCustomerRow): string | undefined =>
  formatAdminCustomerLocation(
    row.city === undefined || row.countryCode === undefined
      ? undefined
      : {
          city: row.city,
          countryCode: row.countryCode,
          province: row.province,
        },
  )

const yesNo = (t: BuildCustomerColumnsInput["t"], value: boolean): string =>
  t(value ? ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS.yes : ADMIN_CUSTOMER_BOOLEAN_LABEL_KEYS.no)

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
        exportValue: (row) => row.name,
        skeletonVariant: "title",
      },
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.customer,
    }),
    columnHelper.accessor("email", {
      cell: ({ getValue }) => <span className="block truncate text-sm text-muted-foreground">{getValue()}</span>,
      enableSorting: false,
      header: t("columns.email"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.email,
      meta: {
        exportValue: (row) => row.email,
        skeletonVariant: "text",
      },
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.email,
    }),
    columnHelper.accessor((row) => row.id, {
      cell: ({ row }) => <span className="block font-mono text-xs whitespace-nowrap text-muted-foreground">{row.original.id}</span>,
      header: t("columns.id"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.recordId,
      meta: { ...CATALOG_RECORD_ID_COLUMN_META, exportValue: (row) => row.id },
      ...fixedDataGridColumnWidth(ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.recordId),
    }),
    columnHelper.accessor((row) => row.stripeCustomerId ?? "", {
      cell: ({ row }) => <CustomerStripeCustomerIdCell stripeCustomerId={row.original.stripeCustomerId} />,
      header: t("columns.stripeCustomerId"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.stripeCustomerId,
      meta: { ...CATALOG_RECORD_ID_COLUMN_META, exportValue: (row) => row.stripeCustomerId ?? undefined },
      ...fixedDataGridColumnWidth(ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.stripeCustomerId),
    }),
    columnHelper.accessor("role", {
      cell: ({ getValue }) => <CustomerRoleBadge role={getValue()} />,
      filterFn: "equalsString",
      header: t("columns.role"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.role,
      meta: {
        exportValue: (row) => t(row.role === ROLES.ADMIN ? ADMIN_CUSTOMER_ROLE_LABEL_KEYS.admin : ADMIN_CUSTOMER_ROLE_LABEL_KEYS.customer),
        skeletonVariant: "badge",
      },
      minSize: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.role,
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.role,
    }),
    columnHelper.accessor((row) => row.phone ?? "", {
      cell: ({ row }) => <CustomerPhoneCell phone={row.original.phone} />,
      header: t("columns.phone"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.phone,
      meta: {
        exportValue: (row) => row.phone ?? undefined,
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
        exportValue: (row) => yesNo(t, row.emailVerified),
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
        exportValue: (row) => yesNo(t, row.banned === true),
        skeletonVariant: "badge",
      },
      minSize: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.banned,
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.banned,
    }),
    columnHelper.accessor((row) => resolveCustomerLocation(row) ?? "", {
      cell: ({ row }) => {
        const location = resolveCustomerLocation(row.original)

        return location === undefined ? (
          <span className={EMPTY_DASH_CLASS}>{EMPTY_VALUE}</span>
        ) : (
          <CatalogTruncatedTextCell text={location} />
        )
      },
      header: t("columns.location"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.location,
      meta: {
        exportValue: resolveCustomerLocation,
        fillsRemainingWidth: true,
        skeletonVariant: "text",
      },
      minSize: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.location,
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.location,
    }),
  ])

const buildCustomerMetricsColumns = ({
  format,
  formatLocale,
  t,
  timeZone,
}: Pick<BuildCustomerColumnsInput, "format" | "formatLocale" | "t" | "timeZone">) =>
  columnHelper.columns([
    columnHelper.accessor("orderCount", {
      cell: ({ getValue }) => <span className="font-mono text-sm tabular-nums">{getValue()}</span>,
      header: t("columns.orders"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.orderCount,
      meta: {
        cellClassName: "text-right",
        exportValue: (row) => String(row.orderCount),
        headClassName: "text-right",
        skeletonVariant: "number",
      },
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.orderCount,
    }),
    columnHelper.accessor("totalSpent", {
      cell: ({ getValue }) => (
        <span className="block font-mono text-sm font-medium tabular-nums">
          {formatPrice(getValue(), DEFAULT_ADMIN_CUSTOMER_CURRENCY, formatLocale)}
        </span>
      ),
      filterFn: matchesNumericColumnFilter,
      header: t("columns.spent"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.totalSpent,
      meta: {
        cellClassName: "text-right",
        exportValue: (row) => formatPrice(row.totalSpent, DEFAULT_ADMIN_CUSTOMER_CURRENCY, formatLocale),
        headClassName: "text-right",
        skeletonVariant: "number",
      },
      minSize: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.totalSpent,
      size: ADMIN_CUSTOMER_TABLE_COLUMN_SIZE.totalSpent,
    }),
    columnHelper.accessor("averageOrderValue", {
      cell: ({ getValue }) => (
        <span className="block font-mono text-sm tabular-nums">
          {formatPrice(getValue(), DEFAULT_ADMIN_CUSTOMER_CURRENCY, formatLocale)}
        </span>
      ),
      filterFn: matchesNumericColumnFilter,
      header: t("columns.averageOrderValue"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.averageOrderValue,
      meta: {
        cellClassName: "text-right",
        exportValue: (row) => formatPrice(row.averageOrderValue, DEFAULT_ADMIN_CUSTOMER_CURRENCY, formatLocale),
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
          return <span className={EMPTY_DASH_CLASS}>{EMPTY_VALUE}</span>
        }

        return (
          <span className="text-muted-foreground">
            {format.dateTime(new Date(value), {
              dateStyle: "medium",
            })}
          </span>
        )
      },
      filterFn: matchesDateColumnFilterIn(timeZone),
      header: t("columns.lastOrder"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.lastOrderAt,
      maxSize: DATE_COLUMN_MAX_SIZE,
      meta: {
        exportValue: (row) =>
          row.lastOrderAt === undefined ? undefined : format.dateTime(new Date(row.lastOrderAt), { dateStyle: "medium" }),
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
      filterFn: matchesDateColumnFilterIn(timeZone),
      header: t("columns.createdAt"),
      id: ADMIN_CUSTOMER_TABLE_COLUMN_ID.createdAt,
      maxSize: DATE_COLUMN_MAX_SIZE,
      meta: {
        exportValue: (row) => format.dateTime(new Date(row.createdAt), { dateStyle: "medium" }),
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
  readonly formatLocale: string
  readonly t: ReturnType<typeof useTranslations<"pages.admin.customers">>
  readonly tAdmin: ReturnType<typeof useTranslations<"pages.admin">>
  readonly timeZone: string
}
