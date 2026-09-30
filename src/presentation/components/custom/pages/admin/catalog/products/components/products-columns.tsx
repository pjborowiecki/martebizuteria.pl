import { type JSX, useMemo } from "react"

import { createColumnHelper } from "@tanstack/react-table"
import { cn } from "cn"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import {
  PRODUCT_INVENTORY_LEVEL,
  PRODUCT_STATUS_LABEL_KEYS,
  PRODUCT_TABLE_A11Y_KEYS,
  PRODUCT_TABLE_COLUMN_ID,
  PRODUCT_TABLE_COLUMN_SIZE,
  PRODUCT_VARIANT_KIND,
} from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"
import { resolveProductTitle, resolveProductVariantKind } from "~/src/modules/product/product.utils"

import { Badge } from "~/src/presentation/components/shadcn/badge"

import { selectionColumn } from "~/src/presentation/components/custom/datagrid/components/selection-column"
import { matchesDateColumnFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-date-filter"
import { matchesNumericColumnFilter } from "~/src/presentation/components/custom/datagrid/lib/data-grid-numeric-filter"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { Image } from "~/src/presentation/components/custom/image"
import { CATALOG_RECORD_ID_COLUMN_META } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-record-id-column"
import { createProductReorderColumn } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/product-reorder-column"
import { ProductsRowActions } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-row-actions"
import { CatalogTitleHandleCell } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-title-handle-cell"
import {
  CATALOG_DATAGRID_EMPTY_TEXT_CLASS,
  CATALOG_DATAGRID_MUTED_TEXT_CLASS,
  CatalogTruncatedTextCell,
} from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"
import { ProductStatusBadge } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/product-status-badge"

const ProductImageCell = ({
  thumbnail,
  title,
}: Readonly<{
  thumbnail: string | null
  title: string
}>): JSX.Element => {
  const src = thumbnail ?? undefined

  return (
    <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-secondary">
      {src !== undefined && <Image src={src} alt={title} width={THUMBNAIL_SIZE} height={THUMBNAIL_SIZE} className="object-cover" />}
    </div>
  )
}

const ProductStockCell = ({
  inventoryLevel,
  totalStock,
}: Readonly<{
  inventoryLevel: Product["adminListItem"]["inventoryLevel"]
  totalStock: number
}>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const className = cn(
    "font-mono text-sm tabular-nums",
    inventoryLevel === PRODUCT_INVENTORY_LEVEL.OUT && "text-red-500",
    inventoryLevel === PRODUCT_INVENTORY_LEVEL.LOW && "text-amber-600",
    inventoryLevel === PRODUCT_INVENTORY_LEVEL.OK && "text-foreground",
  )

  return (
    <span className={className} title={inventoryLevel === PRODUCT_INVENTORY_LEVEL.LOW ? t("stockLow") : undefined}>
      {totalStock}
    </span>
  )
}

const statusLabelKey = (
  status: Product["adminListItem"]["status"],
): (typeof PRODUCT_STATUS_LABEL_KEYS)[keyof typeof PRODUCT_STATUS_LABEL_KEYS] => PRODUCT_STATUS_LABEL_KEYS[status]

const ProductVariantKindCell = ({
  variantCount,
}: Readonly<{
  variantCount: Product["adminListItem"]["variantCount"]
}>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const kind = resolveProductVariantKind(variantCount)
  if (kind === PRODUCT_VARIANT_KIND.SINGLE) {
    return (
      <Badge className="font-normal" variant="secondary">
        {t("variantKind.single")}
      </Badge>
    )
  }

  return (
    <Badge className="font-normal" variant="outline">
      {t("variantKind.multiCount", {
        count: variantCount,
      })}
    </Badge>
  )
}

const buildProductTimestampColumns = ({ format, t }: ProductColumnBuildContext) =>
  columnHelper.columns([
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
      id: PRODUCT_TABLE_COLUMN_ID.createdAt,
      maxSize: 320,
      meta: {
        skeletonVariant: "date",
      },
      minSize: PRODUCT_TABLE_COLUMN_SIZE.createdAt,
      size: PRODUCT_TABLE_COLUMN_SIZE.createdAt,
    }),
    columnHelper.accessor("updatedAt", {
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {format.dateTime(new Date(getValue()), {
            dateStyle: "medium",
          })}
        </span>
      ),
      header: t("columns.editedAt"),
      id: PRODUCT_TABLE_COLUMN_ID.editedAt,
      maxSize: 320,
      meta: {
        skeletonVariant: "date",
      },
      minSize: PRODUCT_TABLE_COLUMN_SIZE.editedAt,
      size: PRODUCT_TABLE_COLUMN_SIZE.editedAt,
    }),
  ])

const buildProductDataGridColumns = (context: ProductColumnBuildContext) => {
  const { locale, t, tAdmin } = context

  return columnHelper.columns([
    selectionColumn(columnHelper, {
      all: tAdmin(PRODUCT_TABLE_A11Y_KEYS.selectAll),
      row: tAdmin(PRODUCT_TABLE_A11Y_KEYS.selectRow),
    }),
    createProductReorderColumn(columnHelper),
    columnHelper.display({
      cell: ({ row }) => <ProductImageCell thumbnail={row.original.thumbnail} title={resolveProductTitle(row.original.titles, locale)} />,
      enableSorting: false,
      header: t("columns.image"),
      id: PRODUCT_TABLE_COLUMN_ID.image,
      meta: {
        skeletonVariant: "thumbnail",
      },
      ...fixedDataGridColumnWidth(PRODUCT_TABLE_COLUMN_SIZE.image),
    }),
    columnHelper.accessor((row) => resolveProductTitle(row.titles, locale), {
      cell: ({ row }) => <CatalogTitleHandleCell handle={row.original.handle} title={resolveProductTitle(row.original.titles, locale)} />,
      header: t("columns.product"),
      id: PRODUCT_TABLE_COLUMN_ID.title,
      meta: {
        skeletonVariant: "title",
      },
      size: PRODUCT_TABLE_COLUMN_SIZE.title,
    }),
    columnHelper.accessor((row) => row.id, {
      cell: ({ row }) => <span className="block font-mono text-xs whitespace-nowrap text-muted-foreground">{row.original.id}</span>,
      header: t("columns.id"),
      id: PRODUCT_TABLE_COLUMN_ID.recordId,
      meta: CATALOG_RECORD_ID_COLUMN_META,
      ...fixedDataGridColumnWidth(PRODUCT_TABLE_COLUMN_SIZE.recordId),
    }),
    columnHelper.accessor("status", {
      cell: ({ getValue }) => <ProductStatusBadge status={getValue()} label={t(statusLabelKey(getValue()))} />,
      filterFn: "equalsString",
      header: t("columns.status"),
      id: PRODUCT_TABLE_COLUMN_ID.status,
      meta: {
        skeletonVariant: "badge",
      },
      size: PRODUCT_TABLE_COLUMN_SIZE.status,
    }),
    columnHelper.accessor("skuSummary", {
      cell: ({ getValue }) => <CatalogTruncatedTextCell className="font-mono text-xs" text={getValue()?.trim() ?? ""} />,
      header: t("columns.sku"),
      id: PRODUCT_TABLE_COLUMN_ID.sku,
      meta: {
        skeletonVariant: "text",
      },
      minSize: PRODUCT_TABLE_COLUMN_SIZE.sku,
      size: PRODUCT_TABLE_COLUMN_SIZE.sku,
    }),
    columnHelper.accessor((row) => resolveProductVariantKind(row.variantCount), {
      cell: ({ row }) => <ProductVariantKindCell variantCount={row.original.variantCount} />,
      filterFn: "equalsString",
      header: t("columns.variants"),
      id: PRODUCT_TABLE_COLUMN_ID.variantKind,
      meta: {
        skeletonVariant: "badge",
      },
      minSize: PRODUCT_TABLE_COLUMN_SIZE.variantKind,
      size: PRODUCT_TABLE_COLUMN_SIZE.variantKind,
    }),
    columnHelper.accessor("minPrice", {
      cell: ({ getValue }) => {
        const price = getValue()
        if (price === undefined) {
          return <span className="text-muted-foreground/40">{EMPTY_VALUE}</span>
        }

        return <span className="block font-mono text-sm font-medium tabular-nums">{formatPrice(price, "PLN", locale)}</span>
      },
      filterFn: matchesNumericColumnFilter,
      header: t("columns.price"),
      id: PRODUCT_TABLE_COLUMN_ID.minPrice,
      meta: {
        skeletonVariant: "number",
      },
      size: PRODUCT_TABLE_COLUMN_SIZE.minPrice,
    }),
    columnHelper.accessor("totalStock", {
      cell: ({ row }) => <ProductStockCell inventoryLevel={row.original.inventoryLevel} totalStock={row.original.totalStock} />,
      filterFn: matchesNumericColumnFilter,
      header: t("columns.stock"),
      id: PRODUCT_TABLE_COLUMN_ID.stock,
      meta: {
        skeletonVariant: "number",
      },
      minSize: 128,
      size: PRODUCT_TABLE_COLUMN_SIZE.stock,
    }),
    columnHelper.accessor("categoryTitle", {
      cell: ({ getValue }) => {
        const value = getValue()
        if (value === undefined || value === "") {
          return <span className={CATALOG_DATAGRID_EMPTY_TEXT_CLASS}>{EMPTY_VALUE}</span>
        }

        return <span className={CATALOG_DATAGRID_MUTED_TEXT_CLASS}>{value}</span>
      },
      header: t("columns.categories"),
      id: PRODUCT_TABLE_COLUMN_ID.category,
      meta: {
        skeletonVariant: "text",
      },
      size: PRODUCT_TABLE_COLUMN_SIZE.category,
    }),
    columnHelper.accessor("collectionTitles", {
      cell: ({ getValue }) => <CatalogTruncatedTextCell text={getValue() ?? ""} />,
      header: t("columns.collections"),
      id: PRODUCT_TABLE_COLUMN_ID.collection,
      meta: {
        skeletonVariant: "text",
      },
      size: PRODUCT_TABLE_COLUMN_SIZE.collection,
    }),
    columnHelper.accessor("attributeTitles", {
      cell: ({ getValue }) => <CatalogTruncatedTextCell text={getValue() ?? ""} />,
      header: t("columns.attributes"),
      id: PRODUCT_TABLE_COLUMN_ID.attributes,
      meta: {
        fillsRemainingWidth: true,
        skeletonVariant: "text",
      },
      minSize: 200,
      size: PRODUCT_TABLE_COLUMN_SIZE.attributes,
    }),
    ...buildProductTimestampColumns(context),
    columnHelper.display({
      cell: ({ row }) => <ProductsRowActions product={row.original} />,
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">{t("columns.actions")}</span>,
      id: PRODUCT_TABLE_COLUMN_ID.actions,
      meta: {
        cellClassName: "pr-4 text-right",
        headClassName: "pr-4",
        preventRowClick: true,
        skeletonVariant: "iconEnd",
      },
      ...fixedDataGridColumnWidth(PRODUCT_TABLE_COLUMN_SIZE.actions),
    }),
  ])
}

export const useProductColumns = () => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const tAdmin = useTranslations("pages.admin")
  const format = useFormatter()
  const locale = useLocale()

  return useMemo(
    () =>
      buildProductDataGridColumns({
        format,
        locale,
        t,
        tAdmin,
      }),
    [format, locale, t, tAdmin],
  )
}

const THUMBNAIL_SIZE = 36

const columnHelper = createColumnHelper<DataGridFeatures, Product["adminListItem"]>()

interface ProductColumnBuildContext {
  readonly format: ReturnType<typeof useFormatter>
  readonly locale: string
  readonly t: ReturnType<typeof useTranslations<"pages.admin.catalog.products.catalogList">>
  readonly tAdmin: ReturnType<typeof useTranslations<"pages.admin">>
}
