import { type JSX, useCallback, useMemo, useState } from "react"

import { useSuspenseInfiniteQuery, useSuspenseQueries } from "@tanstack/react-query"
import { useLocale } from "use-intl/react"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"
import { getCategoriesQuery } from "~/src/modules/product-category/use-cases/get-categories"
import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"
import { getCollectionsQuery } from "~/src/modules/product-collection/use-cases/get-collections"
import {
  type StorefrontCatalogScope,
  type StorefrontProductsSearch,
  buildEffectiveStorefrontProductsSearch,
  countActiveStorefrontProductFilters,
  hasActiveStorefrontProductFilters,
  normalizeStorefrontProductsSearch,
  storefrontCatalogFilterOptions,
} from "~/src/modules/product/product.storefront-catalog"
import { getStorefrontProductsPageQuery } from "~/src/modules/product/use-cases/get-storefront-products-page"

import { ProductsCatalogFilters } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-filters"
import { ProductsCatalogGrid } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-grid"
import { ProductsCatalogMobileFilters } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-mobile-filters"

const useCatalogFilterSources = (scope: StorefrontCatalogScope | undefined): CatalogFilterSources => {
  const showCategoryFilter = scope?.categoryHandle === undefined
  const showCollectionFilter = scope?.collectionHandle === undefined
  const categoryOptions = showCategoryFilter ? [getCategoriesQuery()] : []
  const collectionOptions = showCollectionFilter ? [getCollectionsQuery()] : []
  const categoryQueries = useSuspenseQueries({
    queries: categoryOptions,
  })

  const collectionQueries = useSuspenseQueries({
    queries: collectionOptions,
  })

  return {
    categories: categoryQueries[0]?.data ?? EMPTY_CATEGORIES,
    collections: collectionQueries[0]?.data ?? EMPTY_COLLECTIONS,
    showCategoryFilter,
    showCollectionFilter,
  }
}

export const ProductsCatalogPage = ({
  header,
  i18nNamespace,
  onSearchChange,
  scope,
  search,
}: Readonly<ProductsCatalogPageProps>): JSX.Element => {
  const locale = useLocale()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { categories, collections, showCategoryFilter, showCollectionFilter } = useCatalogFilterSources(scope)
  const normalizedSearch = useMemo(() => normalizeStorefrontProductsSearch(search), [search])
  const effectiveSearch = useMemo(() => buildEffectiveStorefrontProductsSearch(normalizedSearch, scope), [normalizedSearch, scope])
  const catalogFilterOptions = useMemo(() => storefrontCatalogFilterOptions(scope), [scope])
  const filtersActive = hasActiveStorefrontProductFilters(effectiveSearch, catalogFilterOptions)
  const activeFilterCount = countActiveStorefrontProductFilters(effectiveSearch, catalogFilterOptions)
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    getStorefrontProductsPageQuery(normalizedSearch, scope),
  )

  const products = useMemo(() => data.pages.flatMap((page) => page.items), [data.pages])
  const total = data.pages[0]?.total ?? 0
  const handleCloseFilters = useCallback(() => {
    setFiltersOpen(false)
  }, [])

  const handleClearFilters = useCallback(() => {
    onSearchChange(
      {},
      {
        clearAll: true,
      },
    )
  }, [onSearchChange])

  return (
    <main className="mx-auto max-w-400 px-6 pt-8 pb-24 lg:px-12 lg:pt-10 lg:pb-32">
      <header className="mb-8 space-y-3 lg:mb-10">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{header.eyebrow}</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">{header.title}</h1>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-x-12 xl:gap-x-16">
        <div className="hidden lg:col-span-1 lg:block">
          <ProductsCatalogFilters
            categories={categories}
            collections={collections}
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
            <ProductsCatalogFilters
              categories={categories}
              collections={collections}
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
            hasNextPage={hasNextPage}
            i18nNamespace={i18nNamespace}
            infiniteScrollEnabled={!filtersActive}
            isFetchingNextPage={isFetchingNextPage}
            onClearFilters={handleClearFilters}
            products={products}
            total={total}
          />
        </div>
      </div>
    </main>
  )
}

const EMPTY_CATEGORIES: readonly ProductCategory["select"][] = []

const EMPTY_COLLECTIONS: readonly ProductCollection["select"][] = []

interface CatalogFilterSources {
  readonly categories: readonly ProductCategory["select"][]
  readonly collections: readonly ProductCollection["select"][]
  readonly showCategoryFilter: boolean
  readonly showCollectionFilter: boolean
}

export interface StorefrontCatalogHeader {
  readonly eyebrow: string
  readonly title: string
}

interface ProductsCatalogPageProps {
  readonly header: StorefrontCatalogHeader
  readonly i18nNamespace: "pages.category" | "pages.collection" | "pages.products"
  readonly onSearchChange: (
    patch: Partial<StorefrontProductsSearch>,
    options?: {
      readonly clearAll?: boolean
    },
  ) => void
  readonly scope?: StorefrontCatalogScope
  readonly search: StorefrontProductsSearch
}
