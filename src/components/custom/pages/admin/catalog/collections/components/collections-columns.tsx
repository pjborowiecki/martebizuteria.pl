import { type JSX, useMemo } from "react";

import { createColumnHelper } from "@tanstack/react-table";
import { useFormatter, useTranslations } from "use-intl";

import { Badge } from "~/src/components/shadcn/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/src/components/shadcn/tooltip";

import { selectionColumn } from "~/src/components/custom/datagrid/components/selection-column";
import { fixedDataGridColumnWidth } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { Image } from "~/src/components/custom/image";
import { CollectionReorderCell } from "~/src/components/custom/pages/admin/catalog/collections/components/collection-reorder-cell";
import { CollectionsRowActions } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-row-actions";

import {
  COLLECTION_STATUS,
  COLLECTION_STATUS_LABEL_KEYS,
  COLLECTION_TABLE_A11Y_KEYS,
  COLLECTION_TABLE_COLUMN_ID,
  COLLECTION_TABLE_COLUMN_SIZE,
  type CollectionStatus
} from "~/src/modules/collection/collection.constants";
import type { Collection } from "~/src/modules/collection/collection.types";

const THUMBNAIL_SIZE = 36;

const columnHelper = createColumnHelper<Collection["adminListItem"]>();

function CollectionImageCell({ title, image }: Readonly<{ title: string; image: string | null }>): JSX.Element {
  return (
    <div className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-secondary">
      {image !== null && <Image src={image} alt={title} width={THUMBNAIL_SIZE} height={THUMBNAIL_SIZE} className="object-cover" />}
    </div>
  );
}

function CollectionDescriptionCell({ description }: Readonly<{ description: string }>): JSX.Element {
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

function CollectionStatusBadge({
  status,
  t
}: Readonly<{ status: CollectionStatus; t: ReturnType<typeof useTranslations<"admin">> }>): JSX.Element {
  const isActive = status === COLLECTION_STATUS.ACTIVE;
  return (
    <Badge variant={isActive ? "default" : "secondary"} className="text-[11px]">
      {isActive ? t(COLLECTION_STATUS_LABEL_KEYS.active) : t(COLLECTION_STATUS_LABEL_KEYS.draft)}
    </Badge>
  );
}

/**
 * Builds the collections column set. Array order is the canonical default column order
 * for the datagrid (see {@link getDataGridColumnIds} in `use-collections-data-grid`).
 */
export function useCollectionColumns() {
  const t = useTranslations("admin");
  const format = useFormatter();

  return useMemo(
    () => [
      selectionColumn(columnHelper, {
        all: t(COLLECTION_TABLE_A11Y_KEYS.selectAll),
        row: t(COLLECTION_TABLE_A11Y_KEYS.selectRow)
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
        cell: ({ row }) => <CollectionImageCell title={row.original.title} image={row.original.image} />,
        enableSorting: false,
        header: t("collections.columns.image"),
        id: COLLECTION_TABLE_COLUMN_ID.image,
        meta: { skeletonVariant: "thumbnail" },
        ...fixedDataGridColumnWidth(COLLECTION_TABLE_COLUMN_SIZE.image)
      }),
      columnHelper.accessor("title", {
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium uppercase">{row.original.title}</span>
            <span className="truncate font-mono text-xs text-muted-foreground">{row.original.handle}</span>
          </div>
        ),
        header: t("collections.columns.collection"),
        id: COLLECTION_TABLE_COLUMN_ID.title,
        meta: { skeletonVariant: "title" },
        size: COLLECTION_TABLE_COLUMN_SIZE.title
      }),
      columnHelper.accessor("status", {
        cell: ({ getValue }) => <CollectionStatusBadge status={getValue()} t={t} />,
        filterFn: "equalsString",
        header: t("collections.columns.status"),
        id: COLLECTION_TABLE_COLUMN_ID.status,
        meta: { skeletonVariant: "badge" },
        size: COLLECTION_TABLE_COLUMN_SIZE.status
      }),
      columnHelper.accessor("productCount", {
        cell: ({ getValue }) => <span className="font-mono text-sm">{getValue()}</span>,
        header: t("collections.columns.products"),
        id: COLLECTION_TABLE_COLUMN_ID.productCount,
        meta: { cellClassName: "text-right", headClassName: "text-right", skeletonVariant: "number" },
        size: COLLECTION_TABLE_COLUMN_SIZE.productCount
      }),
      columnHelper.accessor("description", {
        cell: ({ getValue }) => <CollectionDescriptionCell description={getValue() ?? ""} />,
        header: t("collections.columns.description"),
        id: COLLECTION_TABLE_COLUMN_ID.description,
        meta: { fillsRemainingWidth: true, skeletonVariant: "text" },
        minSize: COLLECTION_TABLE_COLUMN_SIZE.description,
        size: COLLECTION_TABLE_COLUMN_SIZE.description
      }),
      columnHelper.accessor("createdAt", {
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{format.dateTime(new Date(getValue()), { dateStyle: "medium" })}</span>
        ),
        header: t("collections.columns.createdAt"),
        id: COLLECTION_TABLE_COLUMN_ID.createdAt,
        meta: { absorbsTrailingSlack: true, skeletonVariant: "date" },
        minSize: COLLECTION_TABLE_COLUMN_SIZE.createdAt,
        size: COLLECTION_TABLE_COLUMN_SIZE.createdAt
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
    [format, t]
  );
}
