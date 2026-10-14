import { type JSX } from "react"

import { createColumnHelper } from "@tanstack/react-table"
import { type useFormatter, type useTranslations } from "use-intl/react"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import {
  ADMIN_DISCOUNT_TABLE_A11Y_KEYS,
  ADMIN_DISCOUNT_TABLE_COLUMN_ID,
  ADMIN_DISCOUNT_TABLE_COLUMN_SIZE,
  DISCOUNT_TYPE,
} from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"

import { selectionColumn } from "~/src/presentation/components/custom/datagrid/components/selection-column"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { CATALOG_RECORD_ID_COLUMN_META } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-record-id-column"
import {
  CATALOG_DATAGRID_EMPTY_TEXT_CLASS,
  CATALOG_DATAGRID_MUTED_TEXT_CLASS,
} from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"
import { CouponCodeCell } from "~/src/presentation/components/custom/pages/admin/coupons/components/coupon-code-cell"
import { CouponStatusBadge } from "~/src/presentation/components/custom/pages/admin/coupons/components/coupon-status-badge"
import { CouponsRowActions } from "~/src/presentation/components/custom/pages/admin/coupons/components/coupons-row-actions"

const EmptyCell = (): JSX.Element => <span className={CATALOG_DATAGRID_EMPTY_TEXT_CLASS}>{EMPTY_VALUE}</span>

const NumberCell = ({ value }: Readonly<{ value: string }>): JSX.Element => (
  <span className="font-mono text-sm whitespace-nowrap tabular-nums">{value}</span>
)

const DateCell = ({ format, value }: Readonly<{ format: ColumnsInput["format"]; value: Date | undefined }>): JSX.Element =>
  value === undefined ? (
    <EmptyCell />
  ) : (
    <span className="whitespace-nowrap text-muted-foreground">{format.dateTime(value, { dateStyle: "medium" })}</span>
  )

const formatCouponDiscount = (coupon: Pick<Discount["adminListItem"], "type" | "value">, locale: string): string | undefined => {
  if (coupon.type === DISCOUNT_TYPE.FREE_SHIPPING) {
    return undefined
  }

  if (coupon.type === DISCOUNT_TYPE.PERCENTAGE) {
    return `${String(coupon.value)}%`
  }

  return formatPrice(coupon.value, STORE_CURRENCY_CODE, locale)
}

const buildCouponIdentityColumns = ({ t, tAdmin }: Pick<ColumnsInput, "t" | "tAdmin">) =>
  columnHelper.columns([
    selectionColumn(columnHelper, {
      all: tAdmin(ADMIN_DISCOUNT_TABLE_A11Y_KEYS.selectAll),
      row: tAdmin(ADMIN_DISCOUNT_TABLE_A11Y_KEYS.selectRow),
    }),
    columnHelper.accessor("code", {
      cell: ({ row }) => <CouponCodeCell code={row.original.code} description={row.original.description} />,
      header: t("columns.code"),
      id: ADMIN_DISCOUNT_TABLE_COLUMN_ID.code,
      meta: {
        skeletonVariant: "title",
      },
      size: ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.code,
    }),
    columnHelper.accessor("id", {
      cell: ({ getValue }) => <span className="block font-mono text-xs whitespace-nowrap text-muted-foreground">{getValue()}</span>,
      header: t("columns.id"),
      id: ADMIN_DISCOUNT_TABLE_COLUMN_ID.recordId,
      meta: CATALOG_RECORD_ID_COLUMN_META,
      ...fixedDataGridColumnWidth(ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.recordId),
    }),
    columnHelper.accessor("status", {
      cell: ({ getValue }) => <CouponStatusBadge status={getValue()} />,
      header: t("columns.status"),
      id: ADMIN_DISCOUNT_TABLE_COLUMN_ID.status,
      meta: {
        skeletonVariant: "badge",
      },
      size: ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.status,
    }),
    columnHelper.accessor("type", {
      cell: ({ getValue }) => <span className={CATALOG_DATAGRID_MUTED_TEXT_CLASS}>{t(`type.${getValue()}`)}</span>,
      header: t("columns.type"),
      id: ADMIN_DISCOUNT_TABLE_COLUMN_ID.type,
      meta: {
        fillsRemainingWidth: true,
        skeletonVariant: "text",
      },
      minSize: ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.type,
      size: ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.type,
    }),
  ])

const buildCouponTermsColumns = ({ format, locale, t }: Pick<ColumnsInput, "format" | "locale" | "t">) =>
  columnHelper.columns([
    columnHelper.accessor("value", {
      cell: ({ row }) => {
        const discount = formatCouponDiscount(row.original, locale)

        return discount === undefined ? <EmptyCell /> : <NumberCell value={discount} />
      },
      header: t("columns.discount"),
      id: ADMIN_DISCOUNT_TABLE_COLUMN_ID.value,
      meta: {
        skeletonVariant: "number",
      },
      size: ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.value,
    }),
    columnHelper.accessor("minOrderTotalMinorUnits", {
      cell: ({ getValue }) => {
        const minOrder = getValue()

        return minOrder === undefined ? <EmptyCell /> : <NumberCell value={formatPrice(minOrder, STORE_CURRENCY_CODE, locale)} />
      },
      header: t("columns.minOrder"),
      id: ADMIN_DISCOUNT_TABLE_COLUMN_ID.minOrder,
      meta: {
        skeletonVariant: "number",
      },
      size: ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.minOrder,
    }),
    columnHelper.accessor("usageCount", {
      cell: ({ row }) => (
        <NumberCell
          value={
            row.original.usageLimit === undefined
              ? t("usage.unlimited", { used: row.original.usageCount })
              : t("usage.limited", { limit: row.original.usageLimit, used: row.original.usageCount })
          }
        />
      ),
      header: t("columns.usage"),
      id: ADMIN_DISCOUNT_TABLE_COLUMN_ID.usage,
      meta: {
        skeletonVariant: "number",
      },
      size: ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.usage,
    }),
    columnHelper.accessor("startsAt", {
      cell: ({ getValue }) => <DateCell format={format} value={getValue()} />,
      header: t("columns.startsAt"),
      id: ADMIN_DISCOUNT_TABLE_COLUMN_ID.startsAt,
      meta: {
        skeletonVariant: "date",
      },
      size: ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.startsAt,
    }),
    columnHelper.accessor("endsAt", {
      cell: ({ getValue }) => <DateCell format={format} value={getValue()} />,
      header: t("columns.expires"),
      id: ADMIN_DISCOUNT_TABLE_COLUMN_ID.endsAt,
      meta: {
        skeletonVariant: "date",
      },
      size: ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.endsAt,
    }),
    columnHelper.accessor("createdAt", {
      cell: ({ getValue }) => <DateCell format={format} value={getValue()} />,
      header: t("columns.createdAt"),
      id: ADMIN_DISCOUNT_TABLE_COLUMN_ID.createdAt,
      meta: {
        skeletonVariant: "date",
      },
      size: ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.createdAt,
    }),
    columnHelper.display({
      cell: ({ row }) => <CouponsRowActions coupon={row.original} />,
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">{t("columns.actions")}</span>,
      id: ADMIN_DISCOUNT_TABLE_COLUMN_ID.actions,
      meta: {
        cellClassName: "pr-4 text-right",
        headClassName: "pr-4",
        preventRowClick: true,
        skeletonVariant: "iconEnd",
      },
      ...fixedDataGridColumnWidth(ADMIN_DISCOUNT_TABLE_COLUMN_SIZE.actions),
    }),
  ])

export const buildCouponColumns = (input: ColumnsInput) =>
  columnHelper.columns([...buildCouponIdentityColumns(input), ...buildCouponTermsColumns(input)])

const columnHelper = createColumnHelper<DataGridFeatures, Discount["adminListItem"]>()

interface ColumnsInput {
  readonly format: ReturnType<typeof useFormatter>
  readonly locale: string
  readonly t: ReturnType<typeof useTranslations<"pages.admin.coupons">>
  readonly tAdmin: ReturnType<typeof useTranslations<"pages.admin">>
}
