import { type JSX, useCallback, useMemo } from "react";

import { useFormatter, useLocale, useTranslations } from "use-intl";

import { getProductImageUrl } from "~/src/lib/_utils/image";
import { centsToDisplayAmount, cn } from "~/src/lib/utils";

import { Skeleton } from "~/src/components/shadcn/skeleton";

import { ProductCard } from "~/src/components/custom/product-card";

import { useProductsCatalogInfiniteScroll } from "~/src/hooks/use-products-catalog-infinite-scroll";
import { DEFAULT_VARIANT_TITLE } from "~/src/modules/product-variant/product-variant.utils";
import type { Product } from "~/src/modules/product/product.types";
import { resolveProductSubtitle, resolveProductTitle } from "~/src/modules/product/product.utils";

const FIRST_VARIANT_INDEX = 0;
const PRIORITY_IMAGE_COUNT = 3;
const SKELETON_CARD_COUNT = 3;
const EMPTY_PRODUCT_COUNT = 0;

type CatalogProduct = Pick<Product["select"], "handle" | "id" | "subtitles" | "thumbnail" | "titles"> & {
  readonly variants?: readonly { readonly id: string; readonly price: number; readonly title: string }[];
};

function CatalogProductCard({ index, product }: Readonly<{ index: number; product: CatalogProduct }>): JSX.Element {
  const locale = useLocale();
  const format = useFormatter();
  const params = useMemo(() => ({ handle: product.handle }), [product.handle]);

  const variant = product.variants?.[FIRST_VARIANT_INDEX];
  const variantPrice = variant?.price;
  const price =
    variantPrice === undefined ? undefined : format.number(centsToDisplayAmount(variantPrice), { currency: "PLN", style: "currency" });
  const variantTitle = variant?.title === DEFAULT_VARIANT_TITLE ? "" : (variant?.title ?? "");
  const name = resolveProductTitle(product.titles, locale);
  const detail = resolveProductSubtitle(product.subtitles, locale);

  return (
    <ProductCard
      detail={detail}
      href="/products/$handle"
      image={getProductImageUrl(product.thumbnail)}
      name={name}
      params={params}
      priority={index < PRIORITY_IMAGE_COUNT}
      price={price}
      rawPrice={variantPrice}
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 30vw"
      slug={product.handle}
      variantId={variant?.id}
      variantTitle={variantTitle}
    />
  );
}

function CatalogProductCardSkeleton(): JSX.Element {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-4/5 w-full rounded-none" />
      <div className="mt-4 space-y-1.5">
        <Skeleton className="h-5 w-4/5 rounded-none" />
        <Skeleton className="h-3 w-1/4 rounded-none" />
      </div>
    </div>
  );
}

interface ProductsCatalogGridProps {
  readonly fetchNextPage: () => Promise<unknown>;
  readonly filtersActive: boolean;
  readonly hasNextPage: boolean;
  readonly i18nNamespace: "pages.category" | "pages.collection" | "pages.products";
  readonly infiniteScrollEnabled: boolean;
  readonly isFetchingNextPage: boolean;
  readonly onClearFilters: () => void;
  readonly products: readonly CatalogProduct[];
  readonly total: number;
}

function CatalogResultsToolbar({
  filtersActive,
  onClearFilters,
  total,
  t,
  tFilters
}: Readonly<{
  filtersActive: boolean;
  onClearFilters: () => void;
  total: number;
  t: ReturnType<typeof useTranslations>;
  tFilters: ReturnType<typeof useTranslations>;
}>): JSX.Element {
  const handleClearFilters = useCallback(() => {
    if (filtersActive) {
      onClearFilters();
    }
  }, [filtersActive, onClearFilters]);

  return (
    <div className="flex min-h-5 items-center justify-between gap-4">
      <button
        type="button"
        disabled={!filtersActive}
        onClick={handleClearFilters}
        className={cn(
          "text-[11px] tracking-[0.18em] uppercase transition-colors duration-300",
          filtersActive ? "cursor-pointer text-muted-foreground hover:text-foreground" : "cursor-default text-muted-foreground/35"
        )}
      >
        {tFilters("clearAll")}
      </button>
      <p className="text-[11px] tracking-[0.22em] text-muted-foreground uppercase tabular-nums">{t("resultsCount", { count: total })}</p>
    </div>
  );
}

export function ProductsCatalogGrid({
  fetchNextPage,
  filtersActive,
  hasNextPage,
  i18nNamespace,
  infiniteScrollEnabled,
  isFetchingNextPage,
  onClearFilters,
  products,
  total
}: ProductsCatalogGridProps): JSX.Element {
  const t = useTranslations(i18nNamespace);
  const tFilters = useTranslations("pages.products.filters");
  const sentinelRef = useProductsCatalogInfiniteScroll({
    enabled: infiniteScrollEnabled,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  });

  if (products.length === EMPTY_PRODUCT_COUNT) {
    return (
      <div className="flex min-h-60 items-center justify-center px-6 py-16 text-center">
        <p className="max-w-sm text-sm text-muted-foreground">{t("noProductsFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <CatalogResultsToolbar filtersActive={filtersActive} onClearFilters={onClearFilters} t={t} tFilters={tFilters} total={total} />

      <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product, index) => (
          <CatalogProductCard key={product.id} index={index} product={product} />
        ))}
      </div>

      {isFetchingNextPage && (
        <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
            <CatalogProductCardSkeleton key={index} />
          ))}
        </div>
      )}

      {infiniteScrollEnabled && hasNextPage && <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />}
    </div>
  );
}
