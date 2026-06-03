import { type JSX, useMemo } from "react";

import { createColumnHelper } from "@tanstack/react-table";
import { useFormatter, useTranslations } from "use-intl";

import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/components/shadcn/tooltip";

import { selectionColumn } from "~/src/components/custom/datagrid/components/selection-column";
import { fixedDataGridColumnWidth } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { Image } from "~/src/components/custom/image";
import { CategoriesRowActions } from "~/src/components/custom/pages/admin/catalog/categories/components/categories-row-actions";
import { CategoryReorderCell } from "~/src/components/custom/pages/admin/catalog/categories/components/category-reorder-cell";
import { CatalogStatusBadge } from "~/src/components/custom/pages/admin/catalog/components/catalog-status-badge";
import { CatalogTitleHandleCell } from "~/src/components/custom/pages/admin/catalog/components/catalog-title-handle-cell";

import {
  CATEGORY_STATUS,
  CATEGORY_STATUS_LABEL_KEYS,
  CATEGORY_TABLE_A11Y_KEYS,
  CATEGORY_TABLE_COLUMN_ID,
  CATEGORY_TABLE_COLUMN_SIZE
} from "~/src/modules/category/category.constants";
import type { Category } from "~/src/modules/category/category.types";

const THUMBNAIL_SIZE = 36;

const columnHelper = createColumnHelper<Category["adminListItem"]>();

function CategoryImageCell({ image, title }: Readonly<{ image: string | null; title: string }>): JSX.Element {
  return (
    <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-secondary">
      {image !== null && <Image src={image} alt={title} width={THUMBNAIL_SIZE} height={THUMBNAIL_SIZE} className="object-cover" />}
    </div>
  );
}

function CategoryDescriptionCell({ description }: Readonly<{ description: string }>): JSX.Element {
  const trigger = useMemo(() => <span className="block cursor-default truncate text-muted-foreground">{description}</span>, [description]);

  if (description === "") {
    return <span className="text-muted-foreground/40">—</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent className="max-w-sm whitespace-normal">{description}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Builds the categories column set. Array order is the canonical default column order
 * for the datagrid (see {@link getDataGridColumnIds} in `use-categories-data-grid`).
 */
export function useCategoryColumns() {
  const t = useTranslations("admin");
  const format = useFormatter();

  return useMemo(
    () => [
      selectionColumn(columnHelper, {
        all: t(CATEGORY_TABLE_A11Y_KEYS.selectAll),
        row: t(CATEGORY_TABLE_A11Y_KEYS.selectRow)
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
          skeletonVariant: "icon"
        },
        ...fixedDataGridColumnWidth(CATEGORY_TABLE_COLUMN_SIZE.drag)
      }),
      columnHelper.display({
        cell: ({ row }) => <CategoryImageCell image={row.original.image} title={row.original.title} />,
        enableSorting: false,
        header: t("categories.columns.image"),
        id: CATEGORY_TABLE_COLUMN_ID.image,
        meta: { skeletonVariant: "thumbnail" },
        ...fixedDataGridColumnWidth(CATEGORY_TABLE_COLUMN_SIZE.image)
      }),
      columnHelper.accessor("title", {
        cell: ({ row }) => <CatalogTitleHandleCell handle={row.original.handle} title={row.original.title} />,
        header: t("categories.columns.title"),
        id: CATEGORY_TABLE_COLUMN_ID.title,
        meta: { skeletonVariant: "title" },
        size: CATEGORY_TABLE_COLUMN_SIZE.title
      }),
      columnHelper.accessor((row) => row.id, {
        cell: ({ row }) => <span className="block truncate font-mono text-xs text-muted-foreground">{row.original.id}</span>,
        header: t("categories.columns.id"),
        id: CATEGORY_TABLE_COLUMN_ID.recordId,
        meta: { cellClassName: "overflow-hidden", headClassName: "overflow-hidden", skeletonVariant: "text" },
        minSize: CATEGORY_TABLE_COLUMN_SIZE.recordId,
        size: CATEGORY_TABLE_COLUMN_SIZE.recordId
      }),
      columnHelper.accessor("status", {
        cell: ({ getValue }) => {
          const status = getValue();
          const isActive = status === CATEGORY_STATUS.ACTIVE;
          return (
            <CatalogStatusBadge
              isActive={isActive}
              label={t(isActive ? CATEGORY_STATUS_LABEL_KEYS.active : CATEGORY_STATUS_LABEL_KEYS.draft)}
            />
          );
        },
        filterFn: "equalsString",
        header: t("categories.columns.status"),
        id: CATEGORY_TABLE_COLUMN_ID.status,
        meta: { skeletonVariant: "badge" },
        size: CATEGORY_TABLE_COLUMN_SIZE.status
      }),
      columnHelper.accessor("productCount", {
        cell: ({ getValue }) => <span className="font-mono text-sm">{getValue()}</span>,
        header: t("categories.columns.products"),
        id: CATEGORY_TABLE_COLUMN_ID.productCount,
        meta: { cellClassName: "text-right", headClassName: "text-right", skeletonVariant: "number" },
        size: CATEGORY_TABLE_COLUMN_SIZE.productCount
      }),
      columnHelper.accessor("parentTitle", {
        cell: ({ getValue }) => {
          const parentTitle = getValue();
          if (parentTitle === undefined || parentTitle === "") {
            return <span className="text-muted-foreground/40">—</span>;
          }
          return <span className="truncate text-sm">{parentTitle}</span>;
        },
        header: t("categories.columns.parent"),
        id: CATEGORY_TABLE_COLUMN_ID.parent,
        meta: { skeletonVariant: "text" },
        size: CATEGORY_TABLE_COLUMN_SIZE.parent
      }),
      columnHelper.accessor("subtitle", {
        cell: ({ getValue }) => <CategoryDescriptionCell description={getValue() ?? ""} />,
        header: t("categories.columns.subtitle"),
        id: CATEGORY_TABLE_COLUMN_ID.subtitle,
        meta: { skeletonVariant: "text" },
        size: CATEGORY_TABLE_COLUMN_SIZE.subtitle
      }),
      columnHelper.accessor("shortDescription", {
        cell: ({ getValue }) => <CategoryDescriptionCell description={getValue() ?? ""} />,
        header: t("categories.columns.shortDescription"),
        id: CATEGORY_TABLE_COLUMN_ID.shortDescription,
        meta: { skeletonVariant: "text" },
        size: CATEGORY_TABLE_COLUMN_SIZE.shortDescription
      }),
      columnHelper.accessor("description", {
        cell: ({ getValue }) => <CategoryDescriptionCell description={getValue() ?? ""} />,
        header: t("categories.columns.description"),
        id: CATEGORY_TABLE_COLUMN_ID.description,
        meta: { fillsRemainingWidth: true, skeletonVariant: "text" },
        minSize: CATEGORY_TABLE_COLUMN_SIZE.description,
        size: CATEGORY_TABLE_COLUMN_SIZE.description
      }),
      columnHelper.accessor("createdAt", {
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{format.dateTime(new Date(getValue()), { dateStyle: "medium" })}</span>
        ),
        header: t("categories.columns.createdAt"),
        id: CATEGORY_TABLE_COLUMN_ID.createdAt,
        maxSize: 320,
        meta: { skeletonVariant: "date" },
        minSize: CATEGORY_TABLE_COLUMN_SIZE.createdAt,
        size: CATEGORY_TABLE_COLUMN_SIZE.createdAt
      }),
      columnHelper.accessor("updatedAt", {
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{format.dateTime(new Date(getValue()), { dateStyle: "medium" })}</span>
        ),
        header: t("categories.columns.editedAt"),
        id: CATEGORY_TABLE_COLUMN_ID.editedAt,
        maxSize: 320,
        meta: { skeletonVariant: "date" },
        minSize: CATEGORY_TABLE_COLUMN_SIZE.editedAt,
        size: CATEGORY_TABLE_COLUMN_SIZE.editedAt
      }),
      columnHelper.display({
        cell: ({ row }) => <CategoriesRowActions category={row.original} />,
        enableHiding: false,
        enableSorting: false,
        id: CATEGORY_TABLE_COLUMN_ID.actions,
        meta: {
          cellClassName: "pr-4 text-right",
          headClassName: "pr-4",
          preventRowClick: true,
          skeletonVariant: "iconEnd"
        },
        ...fixedDataGridColumnWidth(CATEGORY_TABLE_COLUMN_SIZE.actions)
      })
    ],
    [format, t]
  );
}
