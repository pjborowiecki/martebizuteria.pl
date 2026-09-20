import { type JSX, useMemo } from "react"

import { createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useLocale, useTranslations } from "use-intl"

import {
  PRODUCT_ATTRIBUTE_TABLE_A11Y_KEYS,
  PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID,
  PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE,
} from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import {
  coerceProductAttributeAllowedValues,
  formatAdminProductAttributeAllowedValuesList,
  resolveProductAttributeTitle,
} from "~/src/modules/product-attribute/product-attribute.utils"

import { selectionColumn } from "~/src/presentation/components/custom/datagrid/components/selection-column"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { AttributeAllowedValuesCell } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attribute-allowed-values-cell"
import { AttributeReorderCell } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attribute-reorder-cell"
import { AttributesRowActions } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-row-actions"
import {
  CATALOG_RECORD_ID_COLUMN_META,
  catalogRecordIdColumnWidth,
} from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-record-id-column"
import { CatalogTitleHandleCell } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-title-handle-cell"
import { CATALOG_DATAGRID_EMPTY_TEXT_CLASS } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"

const columnHelper = createColumnHelper<DataGridFeatures, ProductAttribute["adminListItem"]>()

const EmptyDash = (): JSX.Element => <span className={CATALOG_DATAGRID_EMPTY_TEXT_CLASS}>—</span>

const AttributeTypeCell = ({ type }: Readonly<{ type: ProductAttribute["adminListItem"]["type"] }>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.attributes")
  return <span>{t(`types.${type}`)}</span>
}

export const useAttributeColumns = () => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const tAdmin = useTranslations("pages.admin")
  const format = useFormatter()
  const locale = useLocale()

  return useMemo(
    () =>
      columnHelper.columns([
        selectionColumn(columnHelper, {
          all: tAdmin(PRODUCT_ATTRIBUTE_TABLE_A11Y_KEYS.selectAll),
          row: tAdmin(PRODUCT_ATTRIBUTE_TABLE_A11Y_KEYS.selectRow),
        }),
        columnHelper.display({
          cell: ({ row }) => <AttributeReorderCell id={row.original.id} />,
          enableHiding: false,
          enableSorting: false,
          id: PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.drag,
          meta: {
            cellClassName: "px-1 text-center",
            headClassName: "px-1",
            preventRowClick: true,
            skeletonVariant: "icon",
          },
          ...fixedDataGridColumnWidth(PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.drag),
        }),
        columnHelper.accessor("titles", {
          cell: ({ row }) => (
            <CatalogTitleHandleCell handle={row.original.handle} title={resolveProductAttributeTitle(row.original.titles, locale)} />
          ),
          header: t("columns.title"),
          id: PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.title,
          meta: { skeletonVariant: "title" },
          size: PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.title,
        }),
        columnHelper.accessor((row) => row.id, {
          cell: ({ row }) => <span className="block font-mono text-xs whitespace-nowrap text-muted-foreground">{row.original.id}</span>,
          header: t("columns.id"),
          id: PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.recordId,
          meta: CATALOG_RECORD_ID_COLUMN_META,
          ...catalogRecordIdColumnWidth(),
        }),
        columnHelper.accessor("type", {
          cell: ({ getValue }) => <AttributeTypeCell type={getValue()} />,
          filterFn: "equalsString",
          header: t("columns.type"),
          id: PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.type,
          meta: { skeletonVariant: "text" },
          minSize: PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.type,
          size: PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.type,
        }),
        columnHelper.accessor("unit", {
          cell: ({ getValue }) => {
            const unit = getValue()
            if (unit === null || unit === "") {
              return <EmptyDash />
            }
            return <span className="font-mono text-muted-foreground">{unit}</span>
          },
          header: t("columns.unit"),
          id: PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.unit,
          meta: { skeletonVariant: "text" },
          minSize: PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.unit,
          size: PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.unit,
        }),
        columnHelper.accessor("productCount", {
          cell: ({ getValue }) => <span className="font-mono text-sm">{getValue()}</span>,
          header: t("columns.products"),
          id: PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.productCount,
          meta: { cellClassName: "text-right", headClassName: "text-right", skeletonVariant: "number" },
          size: PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.productCount,
        }),
        columnHelper.accessor(
          (row) =>
            formatAdminProductAttributeAllowedValuesList({
              allowedValues: coerceProductAttributeAllowedValues(row.allowedValues),
              locale,
              type: row.type,
            }),
          {
            cell: ({ getValue }) => <AttributeAllowedValuesCell displayText={getValue()} />,
            header: t("columns.allowedValues"),
            id: PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.allowedValues,
            meta: { fillsRemainingWidth: true, skeletonVariant: "text" },
            minSize: PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.allowedValues,
            size: PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.allowedValues,
          },
        ),
        columnHelper.accessor("createdAt", {
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{format.dateTime(new Date(getValue()), { dateStyle: "medium" })}</span>
          ),
          header: t("columns.createdAt"),
          id: PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.createdAt,
          maxSize: 320,
          meta: { skeletonVariant: "date" },
          minSize: PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.createdAt,
          size: PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.createdAt,
        }),
        columnHelper.accessor("updatedAt", {
          cell: ({ getValue }) => (
            <span className="text-muted-foreground">{format.dateTime(new Date(getValue()), { dateStyle: "medium" })}</span>
          ),
          header: t("columns.editedAt"),
          id: PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.editedAt,
          maxSize: 320,
          meta: { skeletonVariant: "date" },
          minSize: PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.editedAt,
          size: PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.editedAt,
        }),
        columnHelper.display({
          cell: ({ row }) => <AttributesRowActions attribute={row.original} />,
          enableHiding: false,
          enableSorting: false,
          id: PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.actions,
          meta: {
            cellClassName: "pr-4 text-right",
            headClassName: "pr-4",
            preventRowClick: true,
            skeletonVariant: "iconEnd",
          },
          ...fixedDataGridColumnWidth(PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE.actions),
        }),
      ]),
    [format, locale, t, tAdmin],
  )
}
