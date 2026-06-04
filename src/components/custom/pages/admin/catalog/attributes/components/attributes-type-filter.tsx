import { type JSX, useCallback, useMemo } from "react";

import { ListFilter } from "lucide-react";
import { useTranslations } from "use-intl";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

import { attributesDataGrid } from "~/src/components/custom/pages/admin/catalog/attributes/utils/attributes-data-grid";

import { PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID, PRODUCT_ATTRIBUTE_TYPES } from "~/src/modules/product-attribute/product-attribute.constants";

const ALL_VALUE = "all";
const TABLE_PAGE_INDEX_START = 0;

/** Faceted type filter wired to the `type` column's filter value. */
export function AttributesTypeFilter(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.attributes");
  const { table } = attributesDataGrid.useDataGrid();
  const column = table.getColumn(PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.type);
  const rawFilter = column?.getFilterValue();
  const current = typeof rawFilter === "string" ? rawFilter : ALL_VALUE;

  const options = useMemo(
    () => [
      { label: t("filter.allTypes"), value: ALL_VALUE },
      ...PRODUCT_ATTRIBUTE_TYPES.map((type) => ({
        label: t(`types.${type}`),
        value: type
      }))
    ],
    [t]
  );

  const handleChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return;
      }
      column?.setFilterValue(value === ALL_VALUE ? undefined : value);
      table.setPageIndex(TABLE_PAGE_INDEX_START);
    },
    [column, table]
  );

  return (
    <Select items={options} value={current} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className="h-9 w-[min(100%,240px)] gap-2 rounded-lg text-xs data-[size=sm]:h-9"
        aria-label={t("filter.type")}
      >
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
