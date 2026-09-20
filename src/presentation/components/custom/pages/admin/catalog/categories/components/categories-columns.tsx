import { type JSX, useMemo } from "react"

import { createColumnHelper } from "@tanstack/react-table"
import { useFormatter, useLocale, useTranslations } from "use-intl"

import {
  CATEGORY_STATUS,
  CATEGORY_STATUS_LABEL_KEYS,
  CATEGORY_TABLE_A11Y_KEYS,
  CATEGORY_TABLE_COLUMN_ID,
  CATEGORY_TABLE_COLUMN_SIZE,
} from "~/src/modules/product-category/product-category.constants"
import { type Category } from "~/src/modules/product-category/product-category.types"
import {
  resolveCategoryDescription,
  resolveCategoryShortDescription,
  resolveCategorySubtitle,
  resolveCategoryTitle,
} from "~/src/modules/product-category/product-category.utils"

import { selectionColumn } from "~/src/presentation/components/custom/datagrid/components/selection-column"
import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { fixedDataGridColumnWidth } from "~/src/presentation/components/custom/datagrid/lib/data-grid.utils"
import { Image } from "~/src/presentation/components/custom/image"
import { CategoriesRowActions } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-row-actions"
import { CategoryReorderCell } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/category-reorder-cell"
import {
  CATALOG_RECORD_ID_COLUMN_META,
  catalogRecordIdColumnWidth,
} from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-record-id-column"
import { CatalogStatusBadge } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-status-badge"
import { CatalogTitleHandleCell } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-title-handle-cell"
import {
  CATALOG_DATAGRID_EMPTY_TEXT_CLASS,
  CATALOG_DATAGRID_MUTED_TEXT_CLASS,
  CatalogTruncatedTextCell,
} from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"
const CategoryImageCell = ({
  image,
  title,
}: Readonly<{
  image: string | null
  title: string
}>): JSX.Element => (
  <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-secondary">
    {image !== null && <Image src={image} alt={title} width={THUMBNAIL_SIZE} height={THUMBNAIL_SIZE} className="object-cover" />}
  </div>
)

const buildCategoryTimestampColumns = ({ format, t }: CategoryColumnBuildContext) =>
  columnHelper.columns([
    columnHelper.accessor("createdAt", {
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {format.dateTime(new Date(getValue()), {
            dateStyle: "medium",
          })}
        </span>
      ),
      header: t("columns.createdAt"),
      id: CATEGORY_TABLE_COLUMN_ID.createdAt,
      maxSize: 320,
      meta: {
        skeletonVariant: "date",
      },
      minSize: CATEGORY_TABLE_COLUMN_SIZE.createdAt,
      size: CATEGORY_TABLE_COLUMN_SIZE.createdAt,
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
      id: CATEGORY_TABLE_COLUMN_ID.editedAt,
      maxSize: 320,
      meta: {
        skeletonVariant: "date",
      },
      minSize: CATEGORY_TABLE_COLUMN_SIZE.editedAt,
      size: CATEGORY_TABLE_COLUMN_SIZE.editedAt,
    }),
  ])

const buildCategoryDataGridColumns = (context: CategoryColumnBuildContext) => {
  const { locale, t, tAdmin } = context
  return columnHelper.columns([
    selectionColumn(columnHelper, {
      all: tAdmin(CATEGORY_TABLE_A11Y_KEYS.selectAll),
      row: tAdmin(CATEGORY_TABLE_A11Y_KEYS.selectRow),
    }),
    columnHelper.display({
      cell: ({ row }) => <CategoryReorderCell id={row.original.id} />,
      enableHiding: false,
      enableSorting: false,
      id: CATEGORY_TABLE_COLUMN_ID.drag,
      meta: {
        cellClassName: "px-1 text-center",
        headClassName: "px-1",
        preventRowClick: true,
        skeletonVariant: "icon",
      },
      ...fixedDataGridColumnWidth(CATEGORY_TABLE_COLUMN_SIZE.drag),
    }),
    columnHelper.display({
      cell: ({ row }) => <CategoryImageCell image={row.original.image} title={resolveCategoryTitle(row.original.titles, locale)} />,
      enableSorting: false,
      header: t("columns.image"),
      id: CATEGORY_TABLE_COLUMN_ID.image,
      meta: {
        skeletonVariant: "thumbnail",
      },
      ...fixedDataGridColumnWidth(CATEGORY_TABLE_COLUMN_SIZE.image),
    }),
    columnHelper.accessor((row) => resolveCategoryTitle(row.titles, locale), {
      cell: ({ row }) => <CatalogTitleHandleCell handle={row.original.handle} title={resolveCategoryTitle(row.original.titles, locale)} />,
      header: t("columns.category"),
      id: CATEGORY_TABLE_COLUMN_ID.title,
      meta: {
        skeletonVariant: "title",
      },
      size: CATEGORY_TABLE_COLUMN_SIZE.title,
    }),
    columnHelper.accessor((row) => row.id, {
      cell: ({ row }) => <span className="block font-mono text-xs whitespace-nowrap text-muted-foreground">{row.original.id}</span>,
      header: t("columns.id"),
      id: CATEGORY_TABLE_COLUMN_ID.recordId,
      meta: CATALOG_RECORD_ID_COLUMN_META,
      ...catalogRecordIdColumnWidth(),
    }),
    columnHelper.accessor("status", {
      cell: ({ getValue }) => {
        const status = getValue()
        const isActive = status === CATEGORY_STATUS.ACTIVE
        return (
          <CatalogStatusBadge
            isActive={isActive}
            label={t(isActive ? CATEGORY_STATUS_LABEL_KEYS.active : CATEGORY_STATUS_LABEL_KEYS.draft)}
          />
        )
      },
      filterFn: "equalsString",
      header: t("columns.status"),
      id: CATEGORY_TABLE_COLUMN_ID.status,
      meta: {
        skeletonVariant: "badge",
      },
      size: CATEGORY_TABLE_COLUMN_SIZE.status,
    }),
    columnHelper.accessor("productCount", {
      cell: ({ getValue }) => <span className="font-mono text-sm">{getValue()}</span>,
      header: t("columns.products"),
      id: CATEGORY_TABLE_COLUMN_ID.productCount,
      meta: {
        cellClassName: "text-right",
        headClassName: "text-right",
        skeletonVariant: "number",
      },
      size: CATEGORY_TABLE_COLUMN_SIZE.productCount,
    }),
    columnHelper.accessor((row) => (row.parentTitles === undefined ? "" : resolveCategoryTitle(row.parentTitles, locale)), {
      cell: ({ row }) => {
        const parentTitle = row.original.parentTitles === undefined ? "" : resolveCategoryTitle(row.original.parentTitles, locale)
        if (parentTitle === "") {
          return <span className={CATALOG_DATAGRID_EMPTY_TEXT_CLASS}>—</span>
        }
        return <span className={CATALOG_DATAGRID_MUTED_TEXT_CLASS}>{parentTitle}</span>
      },
      header: t("columns.parent"),
      id: CATEGORY_TABLE_COLUMN_ID.parent,
      meta: {
        skeletonVariant: "text",
      },
      size: CATEGORY_TABLE_COLUMN_SIZE.parent,
    }),
    columnHelper.accessor((row) => resolveCategorySubtitle(row.subtitles, locale), {
      cell: ({ row }) => <CatalogTruncatedTextCell text={resolveCategorySubtitle(row.original.subtitles, locale)} />,
      header: t("columns.subtitle"),
      id: CATEGORY_TABLE_COLUMN_ID.subtitle,
      meta: {
        skeletonVariant: "text",
      },
      size: CATEGORY_TABLE_COLUMN_SIZE.subtitle,
    }),
    columnHelper.accessor((row) => resolveCategoryShortDescription(row.shortDescriptions, locale), {
      cell: ({ row }) => <CatalogTruncatedTextCell text={resolveCategoryShortDescription(row.original.shortDescriptions, locale)} />,
      header: t("columns.shortDescription"),
      id: CATEGORY_TABLE_COLUMN_ID.shortDescription,
      meta: {
        skeletonVariant: "text",
      },
      size: CATEGORY_TABLE_COLUMN_SIZE.shortDescription,
    }),
    columnHelper.accessor((row) => resolveCategoryDescription(row.descriptions, locale), {
      cell: ({ row }) => <CatalogTruncatedTextCell text={resolveCategoryDescription(row.original.descriptions, locale)} />,
      header: t("columns.description"),
      id: CATEGORY_TABLE_COLUMN_ID.description,
      meta: {
        fillsRemainingWidth: true,
        skeletonVariant: "text",
      },
      minSize: CATEGORY_TABLE_COLUMN_SIZE.description,
      size: CATEGORY_TABLE_COLUMN_SIZE.description,
    }),
    ...buildCategoryTimestampColumns(context),
    columnHelper.display({
      cell: ({ row }) => <CategoriesRowActions category={row.original} />,
      enableHiding: false,
      enableSorting: false,
      id: CATEGORY_TABLE_COLUMN_ID.actions,
      meta: {
        cellClassName: "pr-4 text-right",
        headClassName: "pr-4",
        preventRowClick: true,
        skeletonVariant: "iconEnd",
      },
      ...fixedDataGridColumnWidth(CATEGORY_TABLE_COLUMN_SIZE.actions),
    }),
  ])
}

export const useCategoryColumns = () => {
  const t = useTranslations("pages.admin.catalog.categories")
  const tAdmin = useTranslations("pages.admin")
  const format = useFormatter()
  const locale = useLocale()
  return useMemo(
    () =>
      buildCategoryDataGridColumns({
        format,
        locale,
        t,
        tAdmin,
      }),
    [format, locale, t, tAdmin],
  )
}
const THUMBNAIL_SIZE = 36
const columnHelper = createColumnHelper<DataGridFeatures, Category["adminListItem"]>()
interface CategoryColumnBuildContext {
  readonly format: ReturnType<typeof useFormatter>
  readonly locale: string
  readonly t: ReturnType<typeof useTranslations<"pages.admin.catalog.categories">>
  readonly tAdmin: ReturnType<typeof useTranslations<"pages.admin">>
}
