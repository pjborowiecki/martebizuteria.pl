import { type JSX } from "react";

import { ProductStatCard } from "~/src/components/custom/pages/admin/catalog/products/components/product-stat-card";
import { PRODUCT_STAT_CARDS } from "~/src/components/custom/pages/admin/catalog/products/products-stats.config";

export function ProductsStatsFallback(): JSX.Element {
  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {PRODUCT_STAT_CARDS.map((config) => (
        <ProductStatCard key={config.key} config={config} valuesPending />
      ))}
    </div>
  );
}
