import { type JSX, useCallback, useMemo } from "react"

import { createFileRoute, notFound } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { resolveCategoryDescription, resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils"
import { getStorefrontCategoryQuery } from "~/src/modules/product-category/use-cases/get-storefront-category"
import {
  type StorefrontScopedCategoryCatalogSearch,
  applyStorefrontProductsSearchPatch,
  normalizeStorefrontProductsSearch,
  storefrontScopedCategoryCatalogSearchSchema,
} from "~/src/modules/product/product.storefront-catalog"

import { catalogDebugLog } from "~/src/lib/catalog-debug-log"

import { APP_NAME } from "~/src/presentation/branding/app"

import { ProductsCatalogPage } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-page"
import { prefetchProductsCatalogPage } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog.loader"

import type productsMessages from "~/messages/en-US/pages.products.json"

const CategoryPage = (): JSX.Element => {
  const t = useTranslations("pages.category")
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { handle } = Route.useParams()
  const loaderData = Route.useLoaderData()
  const header = useMemo(
    () => ({
      eyebrow: t("eyebrow"),
      title: loaderData.title,
    }),
    [loaderData.title, t],
  )

  const scope = useMemo(
    () => ({
      categoryHandle: handle,
    }),
    [handle],
  )

  const handleSearchChange = useCallback(
    (
      patch: Partial<StorefrontScopedCategoryCatalogSearch>,
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

  return (
    <ProductsCatalogPage header={header} i18nNamespace="pages.category" onSearchChange={handleSearchChange} scope={scope} search={search} />
  )
}

interface CategoryPageMeta {
  readonly metaDescription: string
  readonly title: string
}

export const Route = createFileRoute("/_storefront/categories/$handle")({
  component: CategoryPage,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?: Readonly<CategoryPageMeta> | undefined
  }>) => ({
    meta: [
      {
        title: loaderData === undefined ? APP_NAME : `${loaderData.title} | ${APP_NAME}`,
      },
      {
        content: loaderData?.metaDescription ?? "",
        name: "description",
      },
    ],
  }),
  loader: async ({ context, deps, params }) => {
    const startedAt = performance.now()
    const { locale } = context
    catalogDebugLog("category.loader.start", {
      handle: params.handle,
      search: deps,
    })

    const [category] = await Promise.all([
      context.queryClient.query(getStorefrontCategoryQuery(params.handle)),
      prefetchProductsCatalogPage(context.queryClient, context.imagePrefetchService, {
        scope: {
          categoryHandle: params.handle,
        },
        search: deps,
      }),
    ])

    if (category === false) {
      catalogDebugLog("category.loader.notFound", {
        handle: params.handle,
      })
      notFound({
        throw: true,
      })

      return {
        metaDescription: "",
        title: "",
      }
    }
    catalogDebugLog("category.loader.done", {
      handle: params.handle,
      ms: Math.round(performance.now() - startedAt),
    })

    const messages = await context.queryClient.query(messagesQueryOptions<typeof productsMessages>({ locale, namespace: "pages.products" }))
    const description = resolveCategoryDescription(category.descriptions, locale)

    return {
      metaDescription: description || messages.description,
      title: resolveCategoryTitle(category.titles, locale),
    }
  },
  loaderDeps: ({ search }: { search: StorefrontScopedCategoryCatalogSearch }) => normalizeStorefrontProductsSearch(search),
  staticData: {
    namespaces: ["pages.category", "pages.products"],
  },
  validateSearch: storefrontScopedCategoryCatalogSearchSchema,
})
