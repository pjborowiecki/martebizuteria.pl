import { type JSX, useCallback, useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import { catalogDebugLog } from "~/src/lib/dev/catalog-debug-log";
import { isValidLocale } from "~/src/lib/utils";

import { CollectionUnavailablePage } from "~/src/components/custom/pages/collections/collection-unavailable-page";
import { prefetchProductsCatalogPage, ProductsCatalogPage } from "~/src/components/custom/pages/products-catalog/products-catalog-page";

import { collectionQueries, collectionQueryOptions } from "~/src/modules/product-collection/product-collection.queries";
import { resolveCollectionDescription, resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils";
import { productQueryOptions } from "~/src/modules/product/product.queries";
import {
  applyStorefrontProductsSearchPatch,
  normalizeStorefrontProductsSearch,
  storefrontScopedCollectionCatalogSearchSchema,
  type StorefrontScopedCollectionCatalogSearch
} from "~/src/modules/product/product.storefront-catalog";

interface CollectionFoundLoaderData {
  readonly description?: string;
  readonly status: "found";
  readonly title: string;
}

interface CollectionUnavailableLoaderData {
  readonly metaDescription: string;
  readonly metaTitle: string;
  readonly status: "unavailable";
}

type CollectionLoaderData = CollectionFoundLoaderData | CollectionUnavailableLoaderData;

const UNAVAILABLE_META = {
  en: {
    description: "This curated edition is not available right now. Discover other collections and new arrivals at M'Arte.",
    title: "Collection unavailable"
  },
  pl: {
    description: "Wybrana edycja nie jest obecnie dostępna w naszym atelier. Odkryj inne kuratorskie kolekcje i premierowe formy M'ARTE.",
    title: "Kolekcja niedostępna"
  }
} as const;

export const Route = createFileRoute("/{-$locale}/_storefront/collections/$handle")({
  component: CollectionPage,
  head: ({ loaderData }: Readonly<{ loaderData?: CollectionLoaderData }>) => {
    if (loaderData?.status === "unavailable") {
      return {
        meta: [{ title: `${loaderData.metaTitle} | ${CONSTANTS.APP_NAME}` }, { content: loaderData.metaDescription, name: "description" }]
      };
    }

    const title = loaderData?.status === "found" ? loaderData.title : "Collection";

    return {
      meta: [
        { title: `${title} | ${CONSTANTS.APP_NAME}` },
        {
          content:
            loaderData?.status === "found" ? (loaderData.description ?? `Browse products in ${loaderData.title}`) : "Browse collection",
          name: "description"
        }
      ]
    };
  },
  loader: async ({ context, deps, params }) => {
    const startedAt = performance.now();
    const locale = params.locale !== undefined && isValidLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
    catalogDebugLog("collection.loader.start", { handle: params.handle, search: deps });

    const collection = await collectionQueries.fetchStorefrontCollectionMetaFn({ data: params.handle });

    if (collection === undefined) {
      catalogDebugLog("collection.loader.unavailable", { handle: params.handle });

      await Promise.all([
        context.queryClient.ensureQueryData(collectionQueryOptions.collectionsQueryOptions()),
        context.queryClient.ensureQueryData(productQueryOptions.landingNewArrivalsQueryOptions())
      ]);

      const unavailableMeta = UNAVAILABLE_META[locale];

      return {
        metaDescription: unavailableMeta.description,
        metaTitle: unavailableMeta.title,
        status: "unavailable"
      } satisfies CollectionUnavailableLoaderData;
    }

    await prefetchProductsCatalogPage(context.queryClient, context.imagePrefetchService, {
      loadCollections: false,
      scope: { collectionHandle: params.handle },
      search: deps
    });

    catalogDebugLog("collection.loader.done", {
      handle: params.handle,
      ms: Math.round(performance.now() - startedAt)
    });

    const description = resolveCollectionDescription(collection.descriptions, locale);

    return {
      description: description === "" ? undefined : description,
      status: "found",
      title: resolveCollectionTitle(collection.titles, locale)
    } satisfies CollectionFoundLoaderData;
  },
  loaderDeps: ({ search }: { search: StorefrontScopedCollectionCatalogSearch }) => normalizeStorefrontProductsSearch(search),
  validateSearch: storefrontScopedCollectionCatalogSearchSchema
});

function CollectionPage(): JSX.Element {
  const loaderData = Route.useLoaderData();

  if (loaderData.status === "unavailable") {
    return <CollectionUnavailablePage />;
  }

  return <CollectionFoundPage loaderData={loaderData} />;
}

function CollectionFoundPage({ loaderData }: Readonly<{ loaderData: CollectionFoundLoaderData }>): JSX.Element {
  const t = useTranslations("pages.collection");
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { handle } = Route.useParams();

  const header = useMemo(
    () => ({
      description: loaderData.description,
      eyebrow: t("eyebrow"),
      title: loaderData.title
    }),
    [loaderData.description, loaderData.title, t]
  );

  const scope = useMemo(() => ({ collectionHandle: handle }), [handle]);

  const handleSearchChange = useCallback(
    (patch: Partial<StorefrontScopedCollectionCatalogSearch>, options?: { readonly clearAll?: boolean }) => {
      void navigate({
        replace: true,
        search: (current) => applyStorefrontProductsSearchPatch(current, patch, options)
      });
    },
    [navigate]
  );

  return (
    <ProductsCatalogPage
      header={header}
      i18nNamespace="pages.collection"
      onSearchChange={handleSearchChange}
      scope={scope}
      search={search}
      showCategoryFilter
      showCollectionFilter={false}
    />
  );
}
