import { type JSX } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import {
  buildProductStatCaption,
  formatProductStatDisplayValue,
  ProductStatCard
} from "~/src/components/custom/pages/admin/catalog/products/components/product-stat-card";
import { useProductsDataGridContext } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid";
import { PRODUCT_STAT_CARDS } from "~/src/components/custom/pages/admin/catalog/products/products-stats.config";

import { productQueryOptions } from "~/src/modules/product/product.queries";

export function ProductsStats(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.catalogList");
  const { data: resolvedStats, isFetching, isStale } = useSuspenseQuery(productQueryOptions.productStatsQueryOptions());
  // Keep card dimensions stable on refresh: only skeleton when there is no cached stats yet.
  const valuesPending = isFetching && isStale;

  const {
    activeCategoryFilter,
    activeCollectionFilter,
    activeInventoryFilter,
    activeStatusFilter,
    activeVariantKindFilter,
    applyProductsFilter
  } = useProductsDataGridContext();

  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {PRODUCT_STAT_CARDS.map((config) => {
        const value = resolvedStats[config.key];
        const caption = valuesPending ? undefined : buildProductStatCaption({ key: config.key, stats: resolvedStats, t, value });

        return (
          <ProductStatCard
            key={config.key}
            activeCategoryFilter={activeCategoryFilter}
            activeCollectionFilter={activeCollectionFilter}
            activeInventoryFilter={activeInventoryFilter}
            activeStatusFilter={activeStatusFilter}
            activeVariantKindFilter={activeVariantKindFilter}
            caption={caption}
            config={config}
            displayValue={formatProductStatDisplayValue(config.key, value)}
            onFilter={applyProductsFilter}
            valuesPending={valuesPending}
          />
        );
      })}
    </div>
  );
}
