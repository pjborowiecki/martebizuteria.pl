import { type JSX, useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { DataGridShell } from "~/src/components/custom/datagrid/components/data-grid-shell";
import { useDataGridInstance } from "~/src/components/custom/datagrid/hooks/use-data-grid-instance";
import { getDataGridColumnIds } from "~/src/components/custom/datagrid/lib/data-grid.utils";
import { useCollectionColumns } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-columns";
import {
  CollectionsSheetProvider,
  useCollectionsSheetState
} from "~/src/components/custom/pages/admin/catalog/collections/hooks/use-collections-sheet";
import { collectionsDataGrid } from "~/src/components/custom/pages/admin/catalog/collections/utils/collections-data-grid";

import { COLLECTION_TABLE_COLUMN_PINNING } from "~/src/modules/collection/collection.constants";
import type { Collection } from "~/src/modules/collection/collection.types";

const MOCK_ROW_COUNT = 12;
const DESCRIPTION_EVERY_N = 3;
const PRODUCT_COUNT_MULTIPLIER = 2;
const STATUS_EVERY_N = 2;
const ZERO = 0;
const MOCK_IMAGE_URL = "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=200&q=80";

function buildMockCollections(): Collection["adminListItem"][] {
  const now = new Date();
  return Array.from({ length: MOCK_ROW_COUNT }, (_, index) => ({
    createdAt: now,
    description:
      index % DESCRIPTION_EVERY_N === ZERO ? "" : `Description for collection ${index} with enough text to truncate in the grid.`,
    handle: `collection-${index}`,
    id: `mock-collection-${index}`,
    image: MOCK_IMAGE_URL,
    metadata: "",
    productCount: index * PRODUCT_COUNT_MULTIPLIER,
    rank: index,
    status: index % STATUS_EVERY_N === ZERO ? "active" : "draft",
    title: `Collection ${index}`,
    updatedAt: now
  }));
}

export const Route = createFileRoute("/{-$locale}/dev/datagrid")({
  component: DevDatagridRoute
});

function DevDatagridUnavailable(): JSX.Element {
  return <p className="p-8 text-sm text-muted-foreground">Not found</p>;
}

/** Dev-only collections datagrid preview (no auth) for layout debugging. */
function DevDatagridRoute(): JSX.Element {
  if (!import.meta.env.DEV) {
    return <DevDatagridUnavailable />;
  }

  return <DevDatagridPreview />;
}

function DevDatagridPreview(): JSX.Element {
  const sheet = useCollectionsSheetState();
  const columns = useCollectionColumns();
  const data = useMemo(() => buildMockCollections(), []);
  const initialColumnOrder = useMemo(() => getDataGridColumnIds(columns), [columns]);

  const { columnReorder, table } = useDataGridInstance({
    columns,
    data,
    getRowId: (row) => row.id,
    initialColumnOrder,
    initialColumnPinning: {
      left: [...COLLECTION_TABLE_COLUMN_PINNING.left],
      right: [...COLLECTION_TABLE_COLUMN_PINNING.right]
    },
    persistenceKey: collectionsDataGrid.persistenceKey
  });

  const { Body, Provider, Toolbar } = collectionsDataGrid;
  const gridValue = useMemo(
    () => ({
      columnReorder,
      emptyMessage: "No rows",
      hasPreferenceOverrides: false,
      isLoading: false,
      persistenceKey: collectionsDataGrid.persistenceKey,
      resetPreferences: () => {},
      rowReorder: undefined,
      searchPlaceholder: "Search",
      table
    }),
    [columnReorder, table]
  );

  return (
    <CollectionsSheetProvider value={sheet}>
      <div className="flex min-h-svh bg-muted" data-testid="dev-datagrid-page">
        <div className="hidden w-64 shrink-0 border-r border-border bg-card md:block" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col p-8">
          <p className="mb-4 font-mono text-xs text-muted-foreground">DEV: collections datagrid layout preview (no auth)</p>
          <Provider value={gridValue}>
            <DataGridShell>
              <Toolbar />
              <Body />
            </DataGridShell>
          </Provider>
        </div>
      </div>
    </CollectionsSheetProvider>
  );
}
