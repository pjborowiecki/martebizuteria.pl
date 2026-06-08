import { type JSX, type ReactNode, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { ProductsCatalogPriceFilter } from "~/src/components/custom/pages/products-catalog/products-catalog-price-filter";
import {
  flattenStorefrontCategoryFilters,
  mapStorefrontCollectionFilters,
  type StorefrontCategoryFilterOption
} from "~/src/components/custom/pages/products-catalog/products-catalog.utils";

import type { Category } from "~/src/modules/product-category/product-category.types";
import type { Collection } from "~/src/modules/product-collection/product-collection.types";
import {
  isStorefrontProductsSort,
  STOREFRONT_PRODUCTS_SORT,
  STOREFRONT_PRODUCTS_SORTS,
  type StorefrontProductsSearch
} from "~/src/modules/product/product.storefront-catalog";

const ALL_VALUE = "";

const CATEGORY_DEPTH_PADDING_CLASS: Record<number, string> = {
  0: "",
  1: "ps-3",
  2: "ps-6",
  3: "ps-9"
};

function categoryDepthPaddingClass(depth: number): string {
  return CATEGORY_DEPTH_PADDING_CLASS[depth] ?? "ps-12";
}

interface ProductsCatalogFiltersProps {
  readonly categories: readonly Category["select"][];
  readonly collections: readonly Collection["select"][];
  readonly locale: string;
  readonly onSearchChange: (patch: Partial<StorefrontProductsSearch>, options?: { readonly clearAll?: boolean }) => void;
  readonly search: StorefrontProductsSearch;
  readonly showCategoryFilter?: boolean;
  readonly showCollectionFilter?: boolean;
}

function FilterSection({ children, title }: Readonly<{ children: ReactNode; title: string }>): JSX.Element {
  return (
    <section className="space-y-4 border-t border-border/30 pt-8 first:border-t-0 first:pt-0">
      <h3 className="text-xs tracking-[0.24em] text-muted-foreground uppercase lg:text-[10px] lg:tracking-[0.28em]">{title}</h3>
      {children}
    </section>
  );
}

function FilterChoice({
  active,
  children,
  onSelect,
  selectValue
}: Readonly<{ active: boolean; children: ReactNode; onSelect: (value: string) => void; selectValue: string }>): JSX.Element {
  const handleClick = useCallback(() => {
    onSelect(selectValue);
  }, [onSelect, selectValue]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group/filter min-h-11 w-full cursor-pointer touch-manipulation border-l py-2.5 pl-3 text-left text-xs tracking-[0.16em] uppercase transition-colors duration-300 lg:min-h-0 lg:py-1.5 lg:text-[11px] lg:tracking-[0.18em]",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground/75 hover:border-foreground/20 hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "inline-block transition-[border-color,opacity] duration-300",
          active ? "border-b border-foreground/70 pb-px" : "border-b border-transparent group-hover/filter:border-foreground/25"
        )}
      >
        {children}
      </span>
    </button>
  );
}

export function ProductsCatalogFilters({
  categories,
  collections,
  locale,
  onSearchChange,
  search,
  showCategoryFilter = true,
  showCollectionFilter = true
}: ProductsCatalogFiltersProps): JSX.Element {
  const t = useTranslations("pages.products.filters");
  const categoryOptions: StorefrontCategoryFilterOption[] = flattenStorefrontCategoryFilters(categories, locale);
  const collectionOptions = mapStorefrontCollectionFilters(collections, locale);
  const handleCategoryChange = useCallback(
    (handle: string) => {
      onSearchChange({ category: handle === ALL_VALUE ? undefined : handle });
    },
    [onSearchChange]
  );

  const handleCollectionChange = useCallback(
    (handle: string) => {
      onSearchChange({ collection: handle === ALL_VALUE ? undefined : handle });
    },
    [onSearchChange]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      if (value === STOREFRONT_PRODUCTS_SORT.RANK) {
        onSearchChange({ sort: undefined });
        return;
      }

      if (isStorefrontProductsSort(value)) {
        onSearchChange({ sort: value });
      }
    },
    [onSearchChange]
  );

  return (
    <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
      <FilterSection title={t("sort")}>
        <div className="space-y-1">
          {STOREFRONT_PRODUCTS_SORTS.map((sortKey) => (
            <FilterChoice
              key={sortKey}
              active={(search.sort ?? STOREFRONT_PRODUCTS_SORT.RANK) === sortKey}
              onSelect={handleSortChange}
              selectValue={sortKey}
            >
              {t(`sortOptions.${sortKey}`)}
            </FilterChoice>
          ))}
        </div>
      </FilterSection>

      {showCategoryFilter && (
        <FilterSection title={t("category")}>
          <div className="space-y-1">
            <FilterChoice active={search.category === undefined} onSelect={handleCategoryChange} selectValue={ALL_VALUE}>
              {t("allCategories")}
            </FilterChoice>
            {categoryOptions.map((option) => (
              <FilterChoice
                key={option.id}
                active={search.category === option.handle}
                onSelect={handleCategoryChange}
                selectValue={option.handle}
              >
                <span className={categoryDepthPaddingClass(option.depth)}>{option.title}</span>
              </FilterChoice>
            ))}
          </div>
        </FilterSection>
      )}

      {showCollectionFilter && (
        <FilterSection title={t("collection")}>
          <div className="space-y-1">
            <FilterChoice active={search.collection === undefined} onSelect={handleCollectionChange} selectValue={ALL_VALUE}>
              {t("allCollections")}
            </FilterChoice>
            {collectionOptions.map((option) => (
              <FilterChoice
                key={option.id}
                active={search.collection === option.handle}
                onSelect={handleCollectionChange}
                selectValue={option.handle}
              >
                {option.title}
              </FilterChoice>
            ))}
          </div>
        </FilterSection>
      )}

      <ProductsCatalogPriceFilter onSearchChange={onSearchChange} search={search} />
    </aside>
  );
}
