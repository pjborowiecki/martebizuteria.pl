import { type JSX, useCallback, useMemo } from "react";

import { ListFilter } from "lucide-react";
import { useTranslations } from "use-intl";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

import { useProductsDataGridContext } from "~/src/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid";

import { PRODUCT_STATUS, type ProductStatus } from "~/src/modules/product/product.constants";

const ALL_VALUE = "all";

function parseStatusFilter(value: string): ProductStatus | undefined {
  if (value === PRODUCT_STATUS.PUBLISHED || value === PRODUCT_STATUS.DRAFT || value === PRODUCT_STATUS.ARCHIVED) {
    return value;
  }

  return undefined;
}

export function ProductsStatusFilter(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.catalogList");
  const { activeStatusFilter, applyProductsFilter } = useProductsDataGridContext();
  const current = activeStatusFilter ?? ALL_VALUE;

  const options = useMemo(
    () => [
      { label: t("filter.allStatuses"), value: ALL_VALUE },
      { label: t("statusActive"), value: PRODUCT_STATUS.PUBLISHED },
      { label: t("statusDraft"), value: PRODUCT_STATUS.DRAFT },
      { label: t("statusArchived"), value: PRODUCT_STATUS.ARCHIVED }
    ],
    [t]
  );

  const handleChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return;
      }
      applyProductsFilter({ status: value === ALL_VALUE ? undefined : parseStatusFilter(value) });
    },
    [applyProductsFilter]
  );

  return (
    <Select items={options} value={current} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="h-9 w-[200px] gap-2 rounded-lg text-xs data-[size=sm]:h-9" aria-label={t("filter.status")}>
        <ListFilter className="size-3.5 text-muted-foreground/60" strokeWidth={1.5} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
