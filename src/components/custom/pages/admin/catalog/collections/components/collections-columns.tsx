import { type JSX, useMemo } from "react";

import { createColumnHelper } from "@tanstack/react-table";
import { useFormatter, useLocale, useTranslations } from "use-intl";

import { selectionColumn } from "~/src/components/custom/datagrid/components/selection-column";
import { fixedDataGridColumnWidth } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { Image } from "~/src/components/custom/image";
import { CollectionReorderCell } from "~/src/components/custom/pages/admin/catalog/collections/components/collection-reorder-cell";
import { CollectionsRowActions } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-row-actions";
import {
  CATALOG_RECORD_ID_COLUMN_META,
  catalogRecordIdColumnWidth
} from "~/src/components/custom/pages/admin/catalog/lib/catalog-record-id-column";
import { CatalogStatusBadge } from "~/src/components/custom/pages/admin/catalog/table/components/catalog-status-badge";
import { CatalogTitleHandleCell } from "~/src/components/custom/pages/admin/catalog/table/components/catalog-title-handle-cell";
import { CatalogTruncatedTextCell } from "~/src/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell";

import {
  COLLECTION_STATUS,
  COLLECTION_STATUS_LABEL_KEYS,
  COLLECTION_TABLE_A11Y_KEYS,
  COLLECTION_TABLE_COLUMN_ID,
  COLLECTION_TABLE_COLUMN_SIZE
} from "~/src/modules/product-collection/product-collection.constants";
import type { Collection } from "~/src/modules/product-collection/product-collection.types";
import { resolveCollectionDescription, resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils";

const THUMBNAIL_SIZE = 36;

const columnHelper = createColumnHelper<Collection["adminListItem"]>();

function CollectionImageCell({ title, image }: Readonly<{ title: string; image: string | null }>): JSX.Element {
  return (
    <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-secondary">
      {image !== null && <Image src={image} alt={title} width={THUMBNAIL_SIZE} height={THUMBNAIL_SIZE} className="object-cover" />}
    </div>
  );
}

/**
 * Builds the collections column set. Array order is the canonical default column order
 * for the datagrid (see {@link getDataGridColumnIds} in `use-collections-data-grid`).
 */
export function useCollectionColumns() {
  const t = useTranslations("pages.admin.catalog.collections");
  const tAdmin = useTranslations("pages.admin");
  const format = useFormatter();
  const locale = useLocale();

  return useMemo(
    () => [
      selectionColumn(columnHelper, {
        all: tAdmin(COLLECTION_TABLE_A11Y_KEYS.selectAll),
        row: tAdmin(COLLECTION_TABLE_A11Y_KEYS.selectRow)
      }),
      columnHelper.display({
        cell: ({ row }) => <CollectionReorderCell id={row.original.id} />,
        enableHiding: false,
        enableSorting: false,
        id: COLLECTION_TABLE_COLUMN_ID.drag,
        meta: {
          cellClassName: "px-1 text-center",
          headClassName: "px-1",
          preventRowClick: true,
          skeletonVariant: "icon"
        },
        ...fixedDataGridColumnWidth(COLLECTION_TABLE_COLUMN_SIZE.drag)
      }),
      columnHelper.display({
        cell: ({ row }) => <CollectionImageCell title={resolveCollectionTitle(row.original.titles, locale)} image={row.original.image} />,
        enableSorting: false,
        header: t("columns.image"),
        id: COLLECTION_TABLE_COLUMN_ID.image,
        meta: { skeletonVariant: "thumbnail" },
        ...fixedDataGridColumnWidth(COLLECTION_TABLE_COLUMN_SIZE.image)
      }),
      columnHelper.accessor((row) => resolveCollectionTitle(row.titles, locale), {
        cell: ({ row }) => (
          <CatalogTitleHandleCell handle={row.original.handle} title={resolveCollectionTitle(row.original.titles, locale)} />
        ),
        header: t("columns.collection"),
        id: COLLECTION_TABLE_COLUMN_ID.title,
        meta: { skeletonVariant: "title" },
        size: COLLECTION_TABLE_COLUMN_SIZE.title
      }),
      columnHelper.accessor((row) => row.id, {
        cell: ({ row }) => <span className="block font-mono text-xs whitespace-nowrap text-muted-foreground">{row.original.id}</span>,
        header: t("columns.id"),
        id: COLLECTION_TABLE_COLUMN_ID.recordId,
        meta: CATALOG_RECORD_ID_COLUMN_META,
        ...catalogRecordIdColumnWidth()
      }),
      columnHelper.accessor("status", {
        cell: ({ getValue }) => {
          const status = getValue();
          const isActive = status === COLLECTION_STATUS.ACTIVE;
          return (
            <CatalogStatusBadge
              isActive={isActive}
              label={t(isActive ? COLLECTION_STATUS_LABEL_KEYS.active : COLLECTION_STATUS_LABEL_KEYS.draft)}
            />
          );
        },
        filterFn: "equalsString",
        header: t("columns.status"),
        id: COLLECTION_TABLE_COLUMN_ID.status,
        meta: { skeletonVariant: "badge" },
        size: COLLECTION_TABLE_COLUMN_SIZE.status
      }),
      columnHelper.accessor("productCount", {
        cell: ({ getValue }) => <span className="font-mono text-sm">{getValue()}</span>,
        header: t("columns.products"),
        id: COLLECTION_TABLE_COLUMN_ID.productCount,
        meta: { cellClassName: "text-right", headClassName: "text-right", skeletonVariant: "number" },
        size: COLLECTION_TABLE_COLUMN_SIZE.productCount
      }),
      columnHelper.accessor((row) => resolveCollectionDescription(row.descriptions, locale), {
        cell: ({ row }) => <CatalogTruncatedTextCell text={resolveCollectionDescription(row.original.descriptions, locale)} />,
        header: t("columns.description"),
        id: COLLECTION_TABLE_COLUMN_ID.description,
        meta: { fillsRemainingWidth: true, skeletonVariant: "text" },
        minSize: COLLECTION_TABLE_COLUMN_SIZE.description,
        size: COLLECTION_TABLE_COLUMN_SIZE.description
      }),
      columnHelper.accessor("createdAt", {
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{format.dateTime(new Date(getValue()), { dateStyle: "medium" })}</span>
        ),
        header: t("columns.createdAt"),
        id: COLLECTION_TABLE_COLUMN_ID.createdAt,
        maxSize: 320,
        meta: { skeletonVariant: "date" },
        minSize: COLLECTION_TABLE_COLUMN_SIZE.createdAt,
        size: COLLECTION_TABLE_COLUMN_SIZE.createdAt
      }),
      columnHelper.accessor("updatedAt", {
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{format.dateTime(new Date(getValue()), { dateStyle: "medium" })}</span>
        ),
        header: t("columns.editedAt"),
        id: COLLECTION_TABLE_COLUMN_ID.editedAt,
        maxSize: 320,
        meta: { skeletonVariant: "date" },
        minSize: COLLECTION_TABLE_COLUMN_SIZE.editedAt,
        size: COLLECTION_TABLE_COLUMN_SIZE.editedAt
      }),
      columnHelper.display({
        cell: ({ row }) => <CollectionsRowActions collection={row.original} />,
        enableHiding: false,
        enableSorting: false,
        id: COLLECTION_TABLE_COLUMN_ID.actions,
        meta: {
          cellClassName: "pr-4 text-right",
          headClassName: "pr-4",
          preventRowClick: true,
          skeletonVariant: "iconEnd"
        },
        ...fixedDataGridColumnWidth(COLLECTION_TABLE_COLUMN_SIZE.actions)
      })
    ],
    [format, locale, t, tAdmin]
  );
}
