import { type JSX, Suspense, useMemo, useRef } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Await, createFileRoute, defer, notFound } from "@tanstack/react-router"
import { useTranslations } from "use-intl"

import { type Product } from "~/src/modules/product/product.types"
import { resolveProductSubtitle, resolveProductTitle } from "~/src/modules/product/product.utils"
import { productQueryOptions as productProductQueryOptions } from "~/src/modules/product/use-cases/get-product"
import { relatedProductsQueryOptions } from "~/src/modules/product/use-cases/get-related-products"

import { getProductImageUrl, prefetchSingleProductImage } from "~/src/lib/image"

import { APP_NAME } from "~/src/presentation/branding/app"

import { useProductAnimations } from "~/src/presentation/components/custom/pages/product-page/hooks/use-product-animations"
import { ProductHeroSection } from "~/src/presentation/components/custom/pages/product-page/sections/product-hero-section"
import { ProductRelatedSection } from "~/src/presentation/components/custom/pages/product-page/sections/product-related-section"
const ProductPage = (): JSX.Element => {
  const { handle } = Route.useParams()
  const { locale } = Route.useRouteContext()
  const { deferredRelated } = Route.useLoaderData()
  const { data: product } = useSuspenseQuery(productProductQueryOptions(handle, locale))
  const t = useTranslations("pages.product")
  const rootRef = useRef<HTMLDivElement>(null)
  useProductAnimations({
    dependencies: [handle],
    rootRef,
  })
  const fallback = useMemo(
    () => <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">{t("loadingRelated")}</div>,
    [t],
  )
  if (product === false) {
    return <div>{t("notFound")}</div>
  }
  return (
    <main className="bg-background text-foreground" ref={rootRef}>
      <ProductHeroSection product={product} />

      {deferredRelated !== undefined && (
        <Suspense fallback={fallback}>
          <Await promise={deferredRelated}>{(relatedProducts) => <MappedRelatedProducts relatedProducts={relatedProducts} />}</Await>
        </Suspense>
      )}
    </main>
  )
}
const MappedRelatedProducts = ({
  relatedProducts,
}: Readonly<{
  relatedProducts: readonly RelatedProduct[]
}>): JSX.Element => {
  const { locale } = Route.useRouteContext()
  const mappedProducts = useMemo(
    () =>
      relatedProducts.map((product) => {
        const variant = product.variants?.[0]
        return {
          handle: product.handle,
          id: product.id,
          image: getProductImageUrl(product.thumbnail),
          name: resolveProductTitle(product.titles, locale),
          subtitle: resolveProductSubtitle(product.subtitles, locale),
          variantId: variant?.id,
          variantPrice: variant?.price,
          variantTitle: variant?.title,
        }
      }),
    [relatedProducts, locale],
  )
  return <ProductRelatedSection products={mappedProducts} />
}
export const Route = createFileRoute("/{-$locale}/_storefront/products/$handle")({
  component: ProductPage,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?:
      | Readonly<{
          description?: string | null
          title: string
        }>
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
    ],
  }),
  loader: async ({ context, params }) => {
    const { locale } = context
    const data = await context.queryClient.query({
      ...productProductQueryOptions(params.handle, locale),
      staleTime: "static",
    })
    if (data === false) {
      notFound({
        throw: true,
      })
      return {
        deferredRelated: undefined,
        description: "",
        title: "",
      }
    }
    prefetchSingleProductImage(data, context.imagePrefetchService)
    const deferredRelated = defer(context.queryClient.query(relatedProductsQueryOptions(data.categoryId, data.id, locale)))
    return {
      deferredRelated,
      description: data.description,
      title: data.title,
    }
  },
  staticData: {
    namespaces: ["pages.product"],
  },
})
type RelatedProduct = Pick<Product["select"], "handle" | "id" | "subtitles" | "thumbnail" | "titles"> & {
  readonly variants?: readonly {
    readonly id: string
    readonly price: number
    readonly title: string
  }[]
}
