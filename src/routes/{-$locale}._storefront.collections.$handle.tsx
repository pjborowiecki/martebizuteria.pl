import { type JSX, useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useFormatter, useLocale, useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import { getProductImageUrl, prefetchProductThumbnails } from "~/src/lib/_utils/image";
import {
  isFirstListPage,
  isValidLocale,
  LIST_PAGE_FIRST,
  listPageSearch,
  listPageSearchSchema,
  nextListPage,
  previousListPage,
  type ListPageSearch
} from "~/src/lib/utils";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import { collectionQueryOptions } from "~/src/modules/product-collection/product-collection.queries";
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils";
import type { Product } from "~/src/modules/product/product.types";
import { resolveProductDescription, resolveProductTitle } from "~/src/modules/product/product.utils";

const CENTS_PER_UNIT = 100;
const FIRST_VARIANT_INDEX = 0;

export const Route = createFileRoute("/{-$locale}/_storefront/collections/$handle")({
  component: CollectionPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<{ title: string }> }>) => ({
    meta: [
      { title: `${loaderData?.title ?? "Collection"} | ${CONSTANTS.APP_NAME}` },
      {
        content: `Browse products in ${loaderData?.title ?? "this collection"}`,
        name: "description"
      }
    ]
  }),
  loader: async ({ context, deps, params }) => {
    const locale = params.locale !== undefined && isValidLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
    const data = await context.queryClient.ensureQueryData(collectionQueryOptions.collectionQueryOptions(params.handle, deps.page));

    if (data === false) {
      notFound({ throw: true });
      return { title: "" };
    }

    prefetchProductThumbnails(data.products.items, context.imagePrefetchService);
    return { title: resolveCollectionTitle(data.titles, locale) };
  },
  loaderDeps: ({ search }: { search: ListPageSearch }) => ({ page: search.page }),
  validateSearch: listPageSearchSchema
});

function CollectionPage(): JSX.Element {
  const t = useTranslations("pages.collection");
  const locale = useLocale();
  const { handle } = Route.useParams();
  const { page } = Route.useSearch();
  const { data: collection } = useSuspenseQuery(collectionQueryOptions.collectionQueryOptions(handle, page));

  if (collection === false) {
    return <div>{t("notFound")}</div>;
  }

  const title = resolveCollectionTitle(collection.titles, locale);
  const [firstProduct] = collection.products.items;
  const nextPage = nextListPage(page);
  const previousPage = previousListPage(page);

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
      </div>

      {firstProduct === undefined && <p>{t("noProductsFound")}</p>}
      {firstProduct !== undefined && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {collection.products.items.map((productItem) => (
              <ProductCard key={productItem.id} product={productItem} />
            ))}
          </div>
          <CatalogPagination currentPage={page} hasMore={collection.products.hasMore} nextPage={nextPage} previousPage={previousPage} />
        </>
      )}
    </main>
  );
}

function CatalogPagination({
  currentPage,
  hasMore,
  nextPage,
  previousPage
}: Readonly<{
  currentPage: number;
  hasMore: boolean;
  nextPage: number;
  previousPage: number;
}>): JSX.Element | undefined {
  const previousSearch = useMemo(() => listPageSearch(previousPage), [previousPage]);
  const nextSearch = useMemo(() => listPageSearch(nextPage), [nextPage]);

  if (isFirstListPage(currentPage) && !hasMore) {
    return undefined;
  }

  return (
    <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Pagination">
      {currentPage > LIST_PAGE_FIRST && (
        <Link from={Route.fullPath} search={previousSearch} className="text-sm font-medium hover:underline">
          Previous
        </Link>
      )}
      <span className="text-sm text-muted-foreground">Page {currentPage}</span>
      {hasMore && (
        <Link from={Route.fullPath} search={nextSearch} className="text-sm font-medium hover:underline">
          Next
        </Link>
      )}
    </nav>
  );
}

function ProductCard({
  product
}: Readonly<{
  product: Pick<Product["select"], "descriptions" | "handle" | "id" | "thumbnail" | "titles"> & {
    readonly variants?: readonly { readonly price: number }[];
  };
}>): JSX.Element {
  const locale = useLocale();
  const params = useMemo(() => ({ handle: product.handle }), [product.handle]);
  const format = useFormatter();
  const title = resolveProductTitle(product.titles, locale);
  const description = resolveProductDescription(product.descriptions, locale);

  const variantPrice = product.variants?.[FIRST_VARIANT_INDEX]?.price;
  const price =
    variantPrice === undefined ? undefined : format.number(variantPrice / CENTS_PER_UNIT, { currency: "PLN", style: "currency" });

  return (
    <LocalizedLink
      to={CONSTANTS.ROUTES.PRODUCT}
      params={params}
      className="group block rounded-lg border p-4 transition-shadow hover:shadow-lg"
    >
      <div className="mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted">
        <ProductImage thumbnail={product.thumbnail} title={title} />
      </div>
      <h2 className="font-semibold group-hover:underline">{title}</h2>
      {description !== "" && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>}
      {price !== undefined && <p className="mt-2 text-sm font-medium">{price}</p>}
    </LocalizedLink>
  );
}

function ProductImage({ thumbnail, title }: Readonly<{ thumbnail: string | null; title: string }>): JSX.Element {
  return <Image src={getProductImageUrl(thumbnail)} alt={title} className="h-full w-full object-cover" width={256} height={256} />;
}
