import { type JSX, useCallback, useMemo } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { resolveCollectionDescription, resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"
import { getCollectionsQuery } from "~/src/modules/product-collection/use-cases/get-collections"
import { getStorefrontCollectionQuery } from "~/src/modules/product-collection/use-cases/get-storefront-collection"
import { getNewArrivalsQuery } from "~/src/modules/product/use-cases/get-new-arrivals"
import {
  applyStorefrontProductsSearchPatch,
  normalizeStorefrontProductsSearch,
} from "~/src/modules/storefront-search/storefront-search.utils"
import {
  type StorefrontScopedCollectionCatalogSearch,
  storefrontScopedCollectionCatalogSearchSchema,
} from "~/src/modules/storefront-search/storefront-search.zod"

import { catalogDebugLog } from "~/src/lib/catalog-debug-log"
import { buildBreadcrumbStructuredData } from "~/src/lib/seo"

import { APP_NAME } from "~/src/presentation/branding/app"

import { CollectionUnavailablePage } from "~/src/presentation/components/custom/pages/collections/collection-unavailable-page"
import { ProductsCatalogPage } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog-page"
import { prefetchProductsCatalogPage } from "~/src/presentation/components/custom/pages/products-catalog/products-catalog.loader"

import type collectionMessages from "~/messages/en-US/pages.collection.json"
import type collectionsMessages from "~/messages/en-US/pages.collections.json"
import type productsMessages from "~/messages/en-US/pages.products.json"
import { ROUTES } from "~/src/routes"

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
      eyebrow: t("eyebrow"),
      title: loaderData.title,
    }),
    [loaderData.title, t],
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
  readonly metaDescription: string
  readonly status: "found"
  readonly structuredData: object
  readonly title: string
}

interface CollectionUnavailableLoaderData {
  readonly metaDescription: string
  readonly metaTitle: string
  readonly status: "unavailable"
}

type CollectionLoaderData = CollectionFoundLoaderData | CollectionUnavailableLoaderData

export const Route = createFileRoute("/_storefront/collections/$handle")({
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
        ...(loaderData === undefined ? [] : [{ "script:ld+json": loaderData.structuredData }]),
      ],
    }
  },
  beforeLoad: ({ search }) => ({
    catalogSearch: normalizeStorefrontProductsSearch(search),
  }),
  loader: async ({ context, params }) => {
    const startedAt = performance.now()
    const { locale } = context
    catalogDebugLog("collection.loader.start", {
      handle: params.handle,
      search: context.catalogSearch,
    })

    const [collection] = await Promise.all([
      context.queryClient.query(getStorefrontCollectionQuery(params.handle)),
      prefetchProductsCatalogPage(context.queryClient, context.imagePrefetchService, {
        scope: {
          collectionHandle: params.handle,
        },
        search: context.catalogSearch,
      }),
    ])

    if (collection === false) {
      catalogDebugLog("collection.loader.unavailable", {
        handle: params.handle,
      })
      await Promise.all([
        context.queryClient.query({
          ...getCollectionsQuery(),
          staleTime: "static",
        }),
        context.queryClient.query({
          ...getNewArrivalsQuery(),
          staleTime: "static",
        }),
      ])

      const messages = await context.queryClient.query(
        messagesQueryOptions<typeof collectionMessages>({ locale, namespace: "pages.collection" }),
      )

      return {
        metaDescription: messages.unavailable.description,
        metaTitle: messages.unavailable.title,
        status: "unavailable",
      } satisfies CollectionUnavailableLoaderData
    }
    catalogDebugLog("collection.loader.done", {
      handle: params.handle,
      ms: Math.round(performance.now() - startedAt),
    })

    const [messages, collectionsPageMessages] = await Promise.all([
      context.queryClient.query(messagesQueryOptions<typeof productsMessages>({ locale, namespace: "pages.products" })),
      context.queryClient.query(messagesQueryOptions<typeof collectionsMessages>({ locale, namespace: "pages.collections" })),
    ])
    const description = resolveCollectionDescription(collection.descriptions, locale)
    const title = resolveCollectionTitle(collection.titles, locale)

    return {
      metaDescription: description || messages.description,
      status: "found",
      structuredData: buildBreadcrumbStructuredData({
        leaf: title,
        locale,
        sections: [{ name: collectionsPageMessages.title, path: ROUTES.COLLECTIONS }],
      }),
      title,
    } satisfies CollectionFoundLoaderData
  },
  staticData: {
    namespaces: ["pages.collection", "pages.products"],
  },
  validateSearch: storefrontScopedCollectionCatalogSearchSchema,
})
