import { type JSX, useCallback, useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { prefetchProductsCatalogPage, ProductsCatalogPage } from "~/src/components/custom/pages/products-catalog/products-catalog-page";

import {
  applyStorefrontProductsSearchPatch,
  normalizeStorefrontProductsSearch,
  storefrontProductsSearchSchema,
  type StorefrontProductsSearch
} from "~/src/modules/product/product.storefront-catalog";

export const Route = createFileRoute("/{-$locale}/_storefront/products/")({
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: `Products | ${CONSTANTS.APP_NAME}` },
      { content: "Browse our complete collection of exquisite jewelry.", name: "description" }
    ]
  }),
  loader: async ({ context, deps }) => {
    await prefetchProductsCatalogPage(context.queryClient, context.imagePrefetchService, { search: deps });
  },
  loaderDeps: ({ search }: { search: StorefrontProductsSearch }) => normalizeStorefrontProductsSearch(search),
  validateSearch: storefrontProductsSearchSchema
});

function ProductsPage(): JSX.Element {
  const t = useTranslations("pages.products");
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const header = useMemo(
    () => ({
      eyebrow: t("eyebrow"),
      title: t("title")
    }),
    [t]
  );

  const handleSearchChange = useCallback(
    (patch: Partial<StorefrontProductsSearch>, options?: { readonly clearAll?: boolean }) => {
      void navigate({
        replace: true,
        search: (current) => applyStorefrontProductsSearchPatch(current, patch, options)
      });
    },
    [navigate]
  );

  return <ProductsCatalogPage header={header} i18nNamespace="pages.products" onSearchChange={handleSearchChange} search={search} />;
}
