import { type JSX } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { PRODUCT_ATTRIBUTE_STAT_CARDS } from "~/src/components/custom/pages/admin/catalog/attributes/attributes-stats.config";
import {
  buildAttributeStatCaption,
  formatAttributeStatDisplayValue,
  AttributeStatCard
} from "~/src/components/custom/pages/admin/catalog/attributes/components/attribute-stat-card";
import { useAttributesDataGridContext } from "~/src/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-data-grid";

import { productAttributeQueryOptions } from "~/src/modules/product-attribute/product-attribute.queries";

/** Lives inside `attributesDataGrid.Provider` so cards can sync the stat filter. */
export function AttributesStats(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.attributes");
  const { data: resolvedStats, isFetching, isStale } = useSuspenseQuery(productAttributeQueryOptions.productAttributeStatsQueryOptions());
  const valuesPending = isFetching && isStale;

  const { activeStatFilter, applyAttributeStatFilter } = useAttributesDataGridContext();

  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {PRODUCT_ATTRIBUTE_STAT_CARDS.map((config) => {
        const value = resolvedStats[config.key];
        const caption = valuesPending ? undefined : buildAttributeStatCaption({ key: config.key, stats: resolvedStats, t, value });

        return (
          <AttributeStatCard
            key={config.key}
            activeFilter={activeStatFilter}
            caption={caption}
            config={config}
            displayValue={formatAttributeStatDisplayValue(value)}
            onFilter={applyAttributeStatFilter}
            valuesPending={valuesPending}
          />
        );
      })}
    </div>
  );
}
