import { type JSX, useCallback } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { CATEGORY_STAT_CARDS } from "~/src/components/custom/pages/admin/catalog/categories/categories-stats.config";
import {
  buildCategoryStatCaption,
  CategoryStatCard,
  formatCategoryStatDisplayValue
} from "~/src/components/custom/pages/admin/catalog/categories/components/category-stat-card";
import { categoriesDataGrid } from "~/src/components/custom/pages/admin/catalog/categories/utils/categories-data-grid";

import type { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants";
import { categoryQueryOptions } from "~/src/modules/product-category/product-category.queries";

const TABLE_PAGE_INDEX_START = 0;

/** Lives inside `categoriesDataGrid.Provider` so cards can sync the status filter. */
export function CategoriesStats(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.categories");
  const { data: resolvedStats, isFetching } = useSuspenseQuery(categoryQueryOptions.categoryStatsQueryOptions());
  const valuesPending = isFetching;

  const { table } = categoriesDataGrid.useDataGrid();
  const statusColumn = table.getColumn("status");
  const rawFilter = statusColumn?.getFilterValue();
  const activeFilter = typeof rawFilter === "string" ? rawFilter : undefined;

  const applyStatusFilter = useCallback(
    (status?: (typeof CATEGORY_STATUS)[keyof typeof CATEGORY_STATUS]) => {
      statusColumn?.setFilterValue(status);
      table.setPageIndex(TABLE_PAGE_INDEX_START);
    },
    [statusColumn, table]
  );

  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CATEGORY_STAT_CARDS.map((config) => {
        const value = resolvedStats[config.key];
        const caption = valuesPending ? undefined : buildCategoryStatCaption({ key: config.key, stats: resolvedStats, t, value });

        return (
          <CategoryStatCard
            key={config.key}
            activeFilter={activeFilter}
            caption={caption}
            config={config}
            displayValue={value === undefined ? undefined : formatCategoryStatDisplayValue(config.key, value)}
            onFilter={applyStatusFilter}
            valuesPending={valuesPending}
          />
        );
      })}
    </div>
  );
}
