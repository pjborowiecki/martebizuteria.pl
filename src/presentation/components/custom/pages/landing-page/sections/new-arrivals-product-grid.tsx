import { type JSX, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useFormatter, useLocale } from "use-intl/react"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { DEFAULT_VARIANT_TITLE } from "~/src/modules/product-variant/product-variant.utils"
import { LANDING_NEW_ARRIVALS_PRODUCT_LIMIT } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"
import { resolveProductSubtitle, resolveProductTitle } from "~/src/modules/product/product.utils"
import { getNewArrivalsQuery } from "~/src/modules/product/use-cases/get-new-arrivals"

import { getProductImageUrl } from "~/src/lib/image"

import { NewArrivalsProductCardSkeleton } from "~/src/presentation/components/custom/pages/landing-page/sections/new-arrivals-product-card-skeleton"
import { ProductCard } from "~/src/presentation/components/custom/product-card"

const LandingNewArrivalCard = ({
  className,
  index,
  product,
}: Readonly<{
  className?: string
  index: number
  product: LandingNewArrivalsProduct
}>): JSX.Element => {
  const locale = useLocale()
  const format = useFormatter()
  const params = useMemo(() => ({ handle: product.handle }), [product.handle])
  const variant = product.variants?.[0]
  const variantPrice = variant?.price
  const price =
    variantPrice === undefined
      ? undefined
      : format.number(centsToDisplayAmount(variantPrice), {
          currency: "PLN",
          style: "currency",
        })
  const variantTitle = variant?.title === DEFAULT_VARIANT_TITLE ? "" : (variant?.title ?? "")
  const name = resolveProductTitle(product.titles, locale)
  const detail = resolveProductSubtitle(product.subtitles, locale)

  return (
    <ProductCard
      className={className}
      detail={detail}
      href="/products/$handle"
      image={getProductImageUrl(product.thumbnail)}
      name={name}
      params={params}
      parallax
      priority={index < PRIORITY_IMAGE_COUNT}
      price={price}
      rawPrice={variantPrice}
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 30vw"
      slug={product.handle}
      variantId={variant?.id}
      variantTitle={variantTitle}
    />
  )
}

export const NewArrivalsProductGrid = (): JSX.Element => {
  const { data: products } = useSuspenseQuery(getNewArrivalsQuery())

  return (
    <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product, index) => (
        <LandingNewArrivalCard key={product.id} className="reveal" index={index} product={product} />
      ))}
    </div>
  )
}

export const NewArrivalsProductGridSkeleton = (): JSX.Element => (
  <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading new arrivals">
    {Array.from({ length: LANDING_NEW_ARRIVALS_PRODUCT_LIMIT }, (_, index) => (
      <NewArrivalsProductCardSkeleton key={index} className="reveal" />
    ))}
  </div>
)

const PRIORITY_IMAGE_COUNT = 3

type LandingNewArrivalsProduct = Pick<Product["select"], "handle" | "id" | "subtitles" | "thumbnail" | "titles"> & {
  readonly variants?: readonly {
    readonly id: string
    readonly price: number
    readonly title: string
  }[]
}
