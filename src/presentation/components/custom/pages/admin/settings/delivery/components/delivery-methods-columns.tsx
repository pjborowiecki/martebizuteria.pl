import { type JSX, useMemo } from "react"

import { createColumnHelper } from "@tanstack/react-table"
import { useLocale, useTranslations } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import {
  DELIVERY_METHOD_STATUS,
  DELIVERY_METHOD_TABLE_COLUMN_ID,
  DELIVERY_METHOD_TABLE_COLUMN_SIZE,
} from "~/src/modules/delivery-method/delivery-method.constants"
import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"
import { resolveDeliveryMethodStatus } from "~/src/modules/delivery-method/delivery-method.utils"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

import { useFormatLocale, useFormatter } from "~/src/hooks/use-display-format"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { CatalogTruncatedTextCell } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"
import { DeliveryMethodReorderCell } from "~/src/presentation/components/custom/pages/admin/settings/delivery/components/delivery-method-reorder-cell"
import { DeliveryMethodsRowActions } from "~/src/presentation/components/custom/pages/admin/settings/delivery/components/delivery-methods-row-actions"
import { SettingsStatusBadge } from "~/src/presentation/components/custom/pages/admin/settings/settings-status-badge"

const columnHelper = createColumnHelper<DataGridFeatures, DeliveryMethod["adminMethod"]>()

const STATUS_TONES = {
  [DELIVERY_METHOD_STATUS.ARCHIVED]: "neutral",
  [DELIVERY_METHOD_STATUS.HIDDEN]: "warning",
  [DELIVERY_METHOD_STATUS.OFFERED]: "positive",
} as const

const NAME_COLUMN_IDS = {
  "en-US": DELIVERY_METHOD_TABLE_COLUMN_ID.nameEn,
  "pl-PL": DELIVERY_METHOD_TABLE_COLUMN_ID.namePl,
} as const

export const deliveryMethodStatusLabel = (method: DeliveryMethod["adminMethod"], t: DeliveryMethodColumnContext["t"]): string => {
  const status = resolveDeliveryMethodStatus(method)

  return status === DELIVERY_METHOD_STATUS.HIDDEN && method.isActive ? t("status.hiddenCarrier") : t(`status.${status}`)
}

const DeliveryMethodStatusCell = ({ method }: Readonly<{ method: DeliveryMethod["adminMethod"] }>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery")

  return <SettingsStatusBadge label={deliveryMethodStatusLabel(method, t)} tone={STATUS_TONES[resolveDeliveryMethodStatus(method)]} />
}

const buildNameColumns = ({ locale, t }: DeliveryMethodColumnContext) =>
  columnHelper.columns([
    columnHelper.accessor((row) => resolveLocalizedString(row.names, locale), {
      cell: ({ getValue }) => <CatalogTruncatedTextCell className="font-medium" muted={false} text={getValue()} />,
      header: t("columns.name"),
      id: DELIVERY_METHOD_TABLE_COLUMN_ID.name,
      meta: { exportValue: (row) => resolveLocalizedString(row.names, locale), skeletonVariant: "title" },
      size: DELIVERY_METHOD_TABLE_COLUMN_SIZE.name,
    }),
    ...I18N.SUPPORTED_LOCALES.map((nameLocale) =>
      columnHelper.accessor((row) => row.names[nameLocale], {
        cell: ({ getValue }) => <CatalogTruncatedTextCell text={getValue()} />,
        header: t("columns.nameIn", { language: new Intl.Locale(nameLocale).language.toUpperCase() }),
        id: NAME_COLUMN_IDS[nameLocale],
        meta: { exportValue: (row) => row.names[nameLocale], skeletonVariant: "text" },
        size: DELIVERY_METHOD_TABLE_COLUMN_SIZE.name,
      }),
    ),
  ])

const buildDetailColumns = ({ format, formatLocale, t }: DeliveryMethodColumnContext) =>
  columnHelper.columns([
    columnHelper.accessor("type", {
      cell: ({ getValue }) => <span>{t(`methods.types.${getValue()}`)}</span>,
      header: t("columns.type"),
      id: DELIVERY_METHOD_TABLE_COLUMN_ID.type,
      meta: { exportValue: (row) => t(`methods.types.${row.type}`), skeletonVariant: "text" },
      size: DELIVERY_METHOD_TABLE_COLUMN_SIZE.type,
    }),
    columnHelper.accessor((row) => row.courier.name, {
      cell: ({ getValue }) => <CatalogTruncatedTextCell muted={false} text={getValue()} />,
      header: t("columns.carrier"),
      id: DELIVERY_METHOD_TABLE_COLUMN_ID.carrier,
      meta: { exportValue: (row) => row.courier.name, skeletonVariant: "text" },
      size: DELIVERY_METHOD_TABLE_COLUMN_SIZE.carrier,
    }),
    columnHelper.accessor("price", {
      cell: ({ getValue }) => <span className="tabular-nums">{formatDeliveryPrice(getValue(), formatLocale, t)}</span>,
      header: t("columns.price"),
      id: DELIVERY_METHOD_TABLE_COLUMN_ID.price,
      meta: {
        cellClassName: "text-right",
        exportValue: (row) => formatDeliveryPrice(row.price, formatLocale, t),
        headClassName: "text-right",
        skeletonVariant: "number",
      },
      size: DELIVERY_METHOD_TABLE_COLUMN_SIZE.price,
    }),
    columnHelper.accessor((row) => resolveDeliveryMethodStatus(row), {
      cell: ({ row }) => <DeliveryMethodStatusCell method={row.original} />,
      filterFn: "equalsString",
      header: t("columns.status"),
      id: DELIVERY_METHOD_TABLE_COLUMN_ID.status,
      meta: { exportValue: (row) => deliveryMethodStatusLabel(row, t), fillsRemainingWidth: true, skeletonVariant: "badge" },
      size: DELIVERY_METHOD_TABLE_COLUMN_SIZE.status,
    }),
    columnHelper.accessor("updatedAt", {
      cell: ({ getValue }) => <span className="text-muted-foreground">{format.dateTime(getValue(), { dateStyle: "medium" })}</span>,
      header: t("columns.editedAt"),
      id: DELIVERY_METHOD_TABLE_COLUMN_ID.editedAt,
      meta: { exportValue: (row) => format.dateTime(row.updatedAt, { dateStyle: "medium" }), skeletonVariant: "date" },
      size: DELIVERY_METHOD_TABLE_COLUMN_SIZE.editedAt,
    }),
    columnHelper.display({
      cell: ({ row }) => <DeliveryMethodsRowActions method={row.original} />,
      enableHiding: false,
      enableSorting: false,
      id: DELIVERY_METHOD_TABLE_COLUMN_ID.actions,
      meta: { cellClassName: "pr-4 text-right", headClassName: "pr-4", preventRowClick: true, skeletonVariant: "iconEnd" },
      ...fixedDataGridColumnWidth(DELIVERY_METHOD_TABLE_COLUMN_SIZE.actions),
    }),
  ])

export const formatDeliveryPrice = (price: number, formatLocale: string, t: DeliveryMethodColumnContext["t"]): string =>
  price === 0 ? t("methods.free") : formatPrice(price, STORE_CURRENCY_CODE, formatLocale)

export const useDeliveryMethodColumns = () => {
  const t = useTranslations("pages.admin.settings.delivery")
  const format = useFormatter()
  const formatLocale = useFormatLocale()
  const locale = useLocale()

  return useMemo(() => {
    const context = { format, formatLocale, locale, t }

    return columnHelper.columns([
      columnHelper.display({
        cell: ({ row }) => <DeliveryMethodReorderCell archived={row.original.archivedAt !== undefined} id={row.original.id} />,
        enableHiding: false,
        enableSorting: false,
        id: DELIVERY_METHOD_TABLE_COLUMN_ID.drag,
        meta: { cellClassName: "px-1 text-center", headClassName: "px-1", preventRowClick: true, skeletonVariant: "icon" },
        ...fixedDataGridColumnWidth(DELIVERY_METHOD_TABLE_COLUMN_SIZE.drag),
      }),
      ...buildNameColumns(context),
      ...buildDetailColumns(context),
    ])
  }, [format, formatLocale, locale, t])
}

interface DeliveryMethodColumnContext {
  readonly format: ReturnType<typeof useFormatter>
  readonly formatLocale: string
  readonly locale: string
  readonly t: ReturnType<typeof useTranslations<"pages.admin.settings.delivery">>
}
