import { type JSX, useCallback, useMemo } from "react";

import { createFileRoute, notFound } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import { catalogDebugLog } from "~/src/lib/dev/catalog-debug-log";
import { isValidLocale } from "~/src/lib/utils";

import { prefetchProductsCatalogPage, ProductsCatalogPage } from "~/src/components/custom/pages/products-catalog/products-catalog-page";

import { categoryQueries } from "~/src/modules/product-category/product-category.queries";
import { resolveCategoryDescription, resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils";
import {
  applyStorefrontProductsSearchPatch,
  normalizeStorefrontProductsSearch,
  storefrontScopedCategoryCatalogSearchSchema,
  type StorefrontScopedCategoryCatalogSearch
} from "~/src/modules/product/product.storefront-catalog";

interface CategoryPageMeta {
  readonly description?: string;
  readonly title: string;
}

export const Route = createFileRoute("/{-$locale}/_storefront/categories/$handle")({
  component: CategoryPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<CategoryPageMeta> }>) => ({
    meta: [
      { title: `${loaderData?.title ?? "Category"} | ${CONSTANTS.APP_NAME}` },
      {
        content: loaderData?.description ?? `Browse products in ${loaderData?.title ?? "this category"}`,
        name: "description"
      }
    ]
  }),
  loader: async ({ context, deps, params }) => {
    const startedAt = performance.now();
    const locale = params.locale !== undefined && isValidLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
    catalogDebugLog("category.loader.start", { handle: params.handle, search: deps });

    const category = await categoryQueries.fetchStorefrontCategoryMetaFn({ data: params.handle });

    if (category === undefined) {
      catalogDebugLog("category.loader.notFound", { handle: params.handle });
      notFound({ throw: true });
      return { description: undefined, title: "" };
    }

    await prefetchProductsCatalogPage(context.queryClient, context.imagePrefetchService, {
      loadCollections: true,
      scope: { categoryHandle: params.handle },
      search: deps
    });

    catalogDebugLog("category.loader.done", {
      handle: params.handle,
      ms: Math.round(performance.now() - startedAt)
    });

    const description = resolveCategoryDescription(category.descriptions, locale);

    return {
      description: description === "" ? undefined : description,
      title: resolveCategoryTitle(category.titles, locale)
    };
  },
  loaderDeps: ({ search }: { search: StorefrontScopedCategoryCatalogSearch }) => normalizeStorefrontProductsSearch(search),
  validateSearch: storefrontScopedCategoryCatalogSearchSchema
});

function CategoryPage(): JSX.Element {
  const t = useTranslations("pages.category");
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { handle } = Route.useParams();
  const loaderData = Route.useLoaderData();

  const header = useMemo(
    () => ({
      description: loaderData.description,
      eyebrow: t("eyebrow"),
      title: loaderData.title
    }),
    [loaderData.description, loaderData.title, t]
  );

  const scope = useMemo(() => ({ categoryHandle: handle }), [handle]);

  const handleSearchChange = useCallback(
    (patch: Partial<StorefrontScopedCategoryCatalogSearch>, options?: { readonly clearAll?: boolean }) => {
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
      i18nNamespace="pages.category"
      onSearchChange={handleSearchChange}
      scope={scope}
      search={search}
      showCategoryFilter={false}
      showCollectionFilter
    />
  );
}
