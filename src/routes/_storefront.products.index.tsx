import { type JSX, useCallback, useMemo } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { createTranslator } from "use-intl"
import { useTranslations } from "use-intl/react"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import {
  applyStorefrontProductsSearchPatch,
  normalizeStorefrontProductsSearch,
} from "~/src/modules/storefront-search/storefront-search.utils"
import { type StorefrontProductsSearch, storefrontProductsSearchSchema } from "~/src/modules/storefront-search/storefront-search.zod"

import { buildBreadcrumbStructuredData } from "~/src/lib/seo"

import { APP_NAME } from "~/src/presentation/branding/app"

import {
  ProductsCatalogPage,
  type StorefrontCatalogHeader,
} from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-page"
import { prefetchProductsCatalogPage } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog.loader"

import type productsMessages from "~/messages/en-US/pages.products.json"

const resolveProductsHeader = (
  query: string | undefined,
  t: ReturnType<typeof useTranslations<"pages.products">>,
): StorefrontCatalogHeader =>
  query === undefined ? { eyebrow: t("eyebrow"), title: t("title") } : { eyebrow: t("search.eyebrow"), title: t("search.title", { query }) }

const ProductsPage = (): JSX.Element => {
  const t = useTranslations("pages.products")
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const header = useMemo(() => resolveProductsHeader(search.q, t), [search.q, t])

  const handleSearchChange = useCallback(
    (
      patch: Partial<StorefrontProductsSearch>,
      options?: {
        readonly clearAll?: boolean
      },
    ) => {
      void navigate({
        replace: true,
        search: (current) => applyStorefrontProductsSearchPatch(current, patch, options),
      })
    },
    [navigate],
  )

  return <ProductsCatalogPage header={header} i18nNamespace="pages.products" onSearchChange={handleSearchChange} search={search} />
}

export const Route = createFileRoute("/_storefront/products/")({
  component: ProductsPage,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?:
      | {
          readonly description: string
          readonly structuredData: object
          readonly title: string
        }
      | undefined
  }>) => ({
    meta: [
      {
        title: loaderData === undefined ? APP_NAME : `${loaderData.title} | ${APP_NAME}`,
      },
      {
        content: loaderData?.description ?? "",
        name: "description",
      },
      ...(loaderData === undefined ? [] : [{ "script:ld+json": loaderData.structuredData }]),
    ],
  }),
  beforeLoad: ({ search }) => ({
    catalogSearch: normalizeStorefrontProductsSearch(search),
  }),
  loader: async ({ context, deps }) => {
    const [messages] = await Promise.all([
      context.queryClient.query(messagesQueryOptions<typeof productsMessages>({ locale: context.locale, namespace: "pages.products" })),
      prefetchProductsCatalogPage(context.queryClient, context.imagePrefetchService, {
        search: context.catalogSearch,
      }),
    ])

    const t = createTranslator({ locale: context.locale, messages })

    return {
      description: messages.description,
      structuredData: buildBreadcrumbStructuredData({ leaf: messages.title, locale: context.locale, sections: [] }),
      title: deps.q === undefined ? messages.title : t("search.pageTitle", { query: deps.q }),
    }
  },
  loaderDeps: ({ search }: { search: StorefrontProductsSearch }) => ({ q: search.q }),
  staticData: {
    namespaces: ["pages.products"],
  },
  validateSearch: storefrontProductsSearchSchema,
})
