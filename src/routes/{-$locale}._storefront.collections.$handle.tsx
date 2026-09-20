import { type JSX, useCallback, useMemo } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { resolveCollectionDescription, resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"
import { collectionsQueryOptions } from "~/src/modules/product-collection/use-cases/get-collections"
import { fetchStorefrontCollectionMetaFn } from "~/src/modules/product-collection/use-cases/get-storefront-collection"
import {
  type StorefrontScopedCollectionCatalogSearch,
  applyStorefrontProductsSearchPatch,
  normalizeStorefrontProductsSearch,
  storefrontScopedCollectionCatalogSearchSchema,
} from "~/src/modules/product/product.storefront-catalog"
import { landingNewArrivalsQueryOptions } from "~/src/modules/product/use-cases/get-new-arrivals"

import { catalogDebugLog } from "~/src/lib/dev/catalog-debug-log"

import { APP_NAME } from "~/src/presentation/branding/app"

import { CollectionUnavailablePage } from "~/src/presentation/components/custom/pages/collections/collection-unavailable-page"
import { ProductsCatalogPage } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-page"
import { prefetchProductsCatalogPage } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog.loader"
const CollectionPage = (): JSX.Element => {
  const loaderData = Route.useLoaderData()
  if (loaderData.status === "unavailable") {
    return <CollectionUnavailablePage />
  }
  return <CollectionFoundPage loaderData={loaderData} />
}
const CollectionFoundPage = ({
  loaderData,
}: Readonly<{
  loaderData: CollectionFoundLoaderData
}>): JSX.Element => {
  const t = useTranslations("pages.collection")
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { handle } = Route.useParams()
  const header = useMemo(
    () => ({
      description: loaderData.description,
      eyebrow: t("eyebrow"),
      title: loaderData.title,
    }),
    [loaderData.description, loaderData.title, t],
  )
  const scope = useMemo(
    () => ({
      collectionHandle: handle,
    }),
    [handle],
  )
  const handleSearchChange = useCallback(
    (
      patch: Partial<StorefrontScopedCollectionCatalogSearch>,
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
    <ProductsCatalogPage
      header={header}
      i18nNamespace="pages.collection"
      onSearchChange={handleSearchChange}
      scope={scope}
      search={search}
    />
  )
}
interface CollectionFoundLoaderData {
  readonly description?: string | undefined
  readonly metaDescription: string
  readonly status: "found"
  readonly title: string
}
interface CollectionUnavailableLoaderData {
  readonly metaDescription: string
  readonly metaTitle: string
  readonly status: "unavailable"
}
type CollectionLoaderData = CollectionFoundLoaderData | CollectionUnavailableLoaderData
export const Route = createFileRoute("/{-$locale}/_storefront/collections/$handle")({
  component: CollectionPage,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?: CollectionLoaderData | undefined
  }>) => {
    if (loaderData?.status === "unavailable") {
      return {
        meta: [
          {
            title: `${loaderData.metaTitle} | ${APP_NAME}`,
          },
          {
            content: loaderData.metaDescription,
            name: "description",
          },
        ],
      }
    }
    return {
      meta: [
        {
          title: loaderData === undefined ? APP_NAME : `${loaderData.title} | ${APP_NAME}`,
        },
        {
          content: loaderData?.metaDescription ?? "",
          name: "description",
        },
      ],
    }
  },
  loader: async ({ context, deps, params }) => {
    const startedAt = performance.now()
    const { locale } = context
    catalogDebugLog("collection.loader.start", {
      handle: params.handle,
      search: deps,
    })
    const collection = await fetchStorefrontCollectionMetaFn({
      data: params.handle,
    })
    if (collection === undefined) {
      catalogDebugLog("collection.loader.unavailable", {
        handle: params.handle,
      })
      await Promise.all([
        context.queryClient.query({
          ...collectionsQueryOptions(),
          staleTime: "static",
        }),
        context.queryClient.query({
          ...landingNewArrivalsQueryOptions(),
          staleTime: "static",
        }),
      ])
      const messages = await context.queryClient.query(messagesQueryOptions(locale, "pages.collection"))
      return {
        metaDescription: messages.unavailable.description,
        metaTitle: messages.unavailable.title,
        status: "unavailable",
      } satisfies CollectionUnavailableLoaderData
    }
    await prefetchProductsCatalogPage(context.queryClient, context.imagePrefetchService, {
      scope: {
        collectionHandle: params.handle,
      },
      search: deps,
    })
    catalogDebugLog("collection.loader.done", {
      handle: params.handle,
      ms: Math.round(performance.now() - startedAt),
    })
    const messages = await context.queryClient.query(messagesQueryOptions(locale, "pages.products"))
    const description = resolveCollectionDescription(collection.descriptions, locale)
    return {
      description: description === "" ? undefined : description,
      metaDescription: description || messages.description,
      status: "found",
      title: resolveCollectionTitle(collection.titles, locale),
    } satisfies CollectionFoundLoaderData
  },
  loaderDeps: ({ search }: { search: StorefrontScopedCollectionCatalogSearch }) => normalizeStorefrontProductsSearch(search),
  staticData: {
    namespaces: ["pages.collection", "pages.products"],
  },
  validateSearch: storefrontScopedCollectionCatalogSearchSchema,
})
