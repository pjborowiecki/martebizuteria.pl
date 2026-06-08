import { type JSX, useCallback, useMemo, useState } from "react";

import { type QueryClient, useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useLocale } from "use-intl";

import { type ImagePrefetchService, prefetchProductThumbnails } from "~/src/lib/_utils/image";
import { catalogDebugLog } from "~/src/lib/dev/catalog-debug-log";

import { ProductsCatalogFilters } from "~/src/components/custom/pages/products-catalog/products-catalog-filters";
import { ProductsCatalogGrid } from "~/src/components/custom/pages/products-catalog/products-catalog-grid";
import { ProductsCatalogMobileFilters } from "~/src/components/custom/pages/products-catalog/products-catalog-mobile-filters";

import { categoryQueryOptions } from "~/src/modules/product-category/product-category.queries";
import type { Category } from "~/src/modules/product-category/product-category.types";
import { collectionQueryOptions } from "~/src/modules/product-collection/product-collection.queries";
import type { Collection } from "~/src/modules/product-collection/product-collection.types";
import { productQueryOptions } from "~/src/modules/product/product.queries";
import {
  buildEffectiveStorefrontProductsSearch,
  countActiveStorefrontProductFilters,
  hasActiveStorefrontProductFilters,
  normalizeStorefrontProductsSearch,
  storefrontCatalogFilterOptions,
  type StorefrontCatalogScope,
  type StorefrontProductsSearch
} from "~/src/modules/product/product.storefront-catalog";

const FIRST_RESULTS_PAGE_INDEX = 0;
const EMPTY_PRODUCT_TOTAL = 0;
const EMPTY_CATEGORIES: readonly Category["select"][] = [];
const EMPTY_COLLECTIONS: readonly Collection["select"][] = [];

export interface StorefrontCatalogHeader {
  readonly description?: string;
  readonly eyebrow: string;
  readonly title: string;
}

interface ProductsCatalogPageProps {
  readonly header: StorefrontCatalogHeader;
  readonly i18nNamespace: "pages.category" | "pages.collection" | "pages.products";
  readonly onSearchChange: (patch: Partial<StorefrontProductsSearch>, options?: { readonly clearAll?: boolean }) => void;
  readonly scope?: StorefrontCatalogScope;
  readonly search: StorefrontProductsSearch;
  readonly showCategoryFilter?: boolean;
  readonly showCollectionFilter?: boolean;
}

function ProductsCatalogFiltersPanel({
  locale,
  onSearchChange,
  search,
  showCategoryFilter,
  showCollectionFilter
}: Readonly<{
  locale: string;
  onSearchChange: ProductsCatalogPageProps["onSearchChange"];
  search: StorefrontProductsSearch;
  showCategoryFilter: boolean;
  showCollectionFilter: boolean;
}>): JSX.Element {
  const { data: categories } = useSuspenseQuery(categoryQueryOptions.categoriesQueryOptions());
  const { data: collections } = useSuspenseQuery(collectionQueryOptions.collectionsQueryOptions());

  return (
    <ProductsCatalogFilters
      categories={categories}
      collections={collections}
      locale={locale}
      onSearchChange={onSearchChange}
      search={search}
      showCategoryFilter={showCategoryFilter}
      showCollectionFilter={showCollectionFilter}
    />
  );
}

function ProductsCatalogFiltersSidebar({
  categories,
  collections,
  locale,
  onSearchChange,
  search,
  showCategoryFilter,
  showCollectionFilter
}: Readonly<{
  categories: readonly Category["select"][];
  collections: readonly Collection["select"][];
  locale: string;
  onSearchChange: ProductsCatalogPageProps["onSearchChange"];
  search: StorefrontProductsSearch;
  showCategoryFilter: boolean;
  showCollectionFilter: boolean;
}>): JSX.Element {
  return (
    <ProductsCatalogFilters
      categories={categories}
      collections={collections}
      locale={locale}
      onSearchChange={onSearchChange}
      search={search}
      showCategoryFilter={showCategoryFilter}
      showCollectionFilter={showCollectionFilter}
    />
  );
}

function ProductsCatalogFiltersWithCategories({
  locale,
  onSearchChange,
  search,
  showCategoryFilter,
  showCollectionFilter
}: Readonly<{
  locale: string;
  onSearchChange: ProductsCatalogPageProps["onSearchChange"];
  search: StorefrontProductsSearch;
  showCategoryFilter: boolean;
  showCollectionFilter: boolean;
}>): JSX.Element {
  const { data: categories } = useSuspenseQuery(categoryQueryOptions.categoriesQueryOptions());

  return (
    <ProductsCatalogFiltersSidebar
      categories={categories}
      collections={EMPTY_COLLECTIONS}
      locale={locale}
      onSearchChange={onSearchChange}
      search={search}
      showCategoryFilter={showCategoryFilter}
      showCollectionFilter={showCollectionFilter}
    />
  );
}

function ProductsCatalogFiltersSlot({
  locale,
  onSearchChange,
  search,
  showCategoryFilter,
  showCollectionFilter
}: Readonly<{
  locale: string;
  onSearchChange: ProductsCatalogPageProps["onSearchChange"];
  search: StorefrontProductsSearch;
  showCategoryFilter: boolean;
  showCollectionFilter: boolean;
}>): JSX.Element {
  if (showCategoryFilter && showCollectionFilter) {
    return (
      <ProductsCatalogFiltersPanel
        locale={locale}
        onSearchChange={onSearchChange}
        search={search}
        showCategoryFilter={showCategoryFilter}
        showCollectionFilter={showCollectionFilter}
      />
    );
  }

  if (showCollectionFilter) {
    return (
      <ProductsCatalogFiltersWithCollections
        locale={locale}
        onSearchChange={onSearchChange}
        search={search}
        showCategoryFilter={showCategoryFilter}
        showCollectionFilter={showCollectionFilter}
      />
    );
  }

  return (
    <ProductsCatalogFiltersWithCategories
      locale={locale}
      onSearchChange={onSearchChange}
      search={search}
      showCategoryFilter={showCategoryFilter}
      showCollectionFilter={showCollectionFilter}
    />
  );
}

function ProductsCatalogFiltersWithCollections({
  locale,
  onSearchChange,
  search,
  showCategoryFilter,
  showCollectionFilter
}: Readonly<{
  locale: string;
  onSearchChange: ProductsCatalogPageProps["onSearchChange"];
  search: StorefrontProductsSearch;
  showCategoryFilter: boolean;
  showCollectionFilter: boolean;
}>): JSX.Element {
  const { data: collections } = useSuspenseQuery(collectionQueryOptions.collectionsQueryOptions());

  return (
    <ProductsCatalogFiltersSidebar
      categories={EMPTY_CATEGORIES}
      collections={collections}
      locale={locale}
      onSearchChange={onSearchChange}
      search={search}
      showCategoryFilter={showCategoryFilter}
      showCollectionFilter={showCollectionFilter}
    />
  );
}

export function ProductsCatalogPage({
  header,
  i18nNamespace,
  onSearchChange,
  scope,
  search,
  showCategoryFilter = true,
  showCollectionFilter = true
}: Readonly<ProductsCatalogPageProps>): JSX.Element {
  const locale = useLocale();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const normalizedSearch = useMemo(() => normalizeStorefrontProductsSearch(search), [search]);
  const effectiveSearch = useMemo(() => buildEffectiveStorefrontProductsSearch(normalizedSearch, scope), [normalizedSearch, scope]);
  const catalogFilterOptions = useMemo(() => storefrontCatalogFilterOptions(scope), [scope]);
  const infiniteScrollEnabled = !hasActiveStorefrontProductFilters(effectiveSearch, catalogFilterOptions);
  const activeFilterCount = countActiveStorefrontProductFilters(effectiveSearch, catalogFilterOptions);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    productQueryOptions.storefrontProductsInfiniteQueryOptions(normalizedSearch, scope)
  );

  const products = useMemo(() => data.pages.flatMap((page) => page.items), [data.pages]);
  const total = data.pages.at(FIRST_RESULTS_PAGE_INDEX)?.total ?? EMPTY_PRODUCT_TOTAL;
  const filtersActive = hasActiveStorefrontProductFilters(effectiveSearch, catalogFilterOptions);

  const handleCloseFilters = useCallback(() => {
    setFiltersOpen(false);
  }, []);

  const handleClearFilters = useCallback(() => {
    onSearchChange({}, { clearAll: true });
  }, [onSearchChange]);

  return (
    <main className="mx-auto max-w-400 px-6 pt-8 pb-24 lg:px-12 lg:pt-10 lg:pb-32">
      <header className="mb-8 space-y-3 lg:mb-10">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{header.eyebrow}</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">{header.title}</h1>
        {header.description !== undefined && header.description !== "" && (
          <p className="max-w-xl text-sm/relaxed text-muted-foreground">{header.description}</p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-x-12 xl:gap-x-16">
        <div className="hidden lg:col-span-1 lg:block">
          <ProductsCatalogFiltersSlot
            locale={locale}
            onSearchChange={onSearchChange}
            search={normalizedSearch}
            showCategoryFilter={showCategoryFilter}
            showCollectionFilter={showCollectionFilter}
          />
        </div>

        <div className="lg:col-span-3">
          <ProductsCatalogMobileFilters
            activeFilterCount={activeFilterCount}
            onClose={handleCloseFilters}
            onOpenChange={setFiltersOpen}
            open={filtersOpen}
          >
            <ProductsCatalogFiltersSlot
              locale={locale}
              onSearchChange={onSearchChange}
              search={normalizedSearch}
              showCategoryFilter={showCategoryFilter}
              showCollectionFilter={showCollectionFilter}
            />
          </ProductsCatalogMobileFilters>

          <ProductsCatalogGrid
            fetchNextPage={fetchNextPage}
            filtersActive={filtersActive}
            hasNextPage={hasNextPage ?? false}
            i18nNamespace={i18nNamespace}
            infiniteScrollEnabled={infiniteScrollEnabled}
            isFetchingNextPage={isFetchingNextPage}
            onClearFilters={handleClearFilters}
            products={products}
            total={total}
          />
        </div>
      </div>
    </main>
  );
}

export interface PrefetchProductsCatalogPageInput {
  readonly loadCollections?: boolean;
  readonly scope?: StorefrontCatalogScope;
  readonly search: StorefrontProductsSearch;
}

export async function prefetchProductsCatalogPage(
  queryClient: QueryClient,
  imagePrefetchService: ImagePrefetchService,
  input: PrefetchProductsCatalogPageInput
): Promise<void> {
  const startedAt = performance.now();
  const normalized = normalizeStorefrontProductsSearch(input.search);
  const loadCollections = input.loadCollections ?? true;

  catalogDebugLog("prefetch.start", { loadCollections, scope: input.scope, search: normalized });

  await Promise.all([
    queryClient.ensureQueryData(categoryQueryOptions.categoriesQueryOptions()),
    loadCollections ? queryClient.ensureQueryData(collectionQueryOptions.collectionsQueryOptions()) : Promise.resolve()
  ]);

  const infiniteData = await queryClient.fetchInfiniteQuery(
    productQueryOptions.storefrontProductsInfiniteQueryOptions(normalized, input.scope)
  );

  const firstPage = infiniteData.pages.at(FIRST_RESULTS_PAGE_INDEX);
  if (firstPage !== undefined) {
    prefetchProductThumbnails(firstPage.items, imagePrefetchService);
  }

  catalogDebugLog("prefetch.done", {
    ms: Math.round(performance.now() - startedAt),
    scope: input.scope,
    total: firstPage?.total
  });
}
