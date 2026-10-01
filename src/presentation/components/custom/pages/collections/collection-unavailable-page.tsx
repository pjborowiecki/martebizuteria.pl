import { type JSX, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { getCollectionsQuery } from "~/src/modules/product-collection/use-cases/get-collections"
import { DEFAULT_VARIANT_TITLE } from "~/src/modules/product-variant/product-variant.utils"
import { type Product } from "~/src/modules/product/product.types"
import { resolveProductSubtitle, resolveProductTitle } from "~/src/modules/product/product.utils"
import { getNewArrivalsQuery } from "~/src/modules/product/use-cases/get-new-arrivals"

import { getProductImageUrl } from "~/src/lib/image"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { CollectionCard } from "~/src/presentation/components/custom/pages/collections/collection-card"
import { ProductCard } from "~/src/presentation/components/custom/product-card"

import { ROUTES } from "~/src/routes"

const SuggestedProductCard = ({
  index,
  product,
}: Readonly<{
  index: number
  product: SuggestedProduct
}>): JSX.Element => {
  const locale = useLocale()
  const format = useFormatter()
  const params = useMemo(
    () => ({
      handle: product.handle,
    }),
    [product.handle],
  )

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
      detail={detail}
      href="/products/$handle"
      image={getProductImageUrl(product.thumbnail)}
      name={name}
      params={params}
      priority={index < PRIORITY_IMAGE_COUNT}
      price={price}
      productId={product.id}
      rawPrice={variantPrice}
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 30vw"
      slug={product.handle}
      variantId={variant?.id}
      variantTitle={variantTitle}
    />
  )
}

export const CollectionUnavailablePage = (): JSX.Element => {
  const t = useTranslations("pages.collection.unavailable")
  const { data: collections } = useSuspenseQuery(getCollectionsQuery())
  const { data: newArrivals } = useSuspenseQuery(getNewArrivalsQuery())
  const suggestedCollections = collections.slice(0, SUGGESTED_COLLECTION_LIMIT)
  const suggestedProducts = newArrivals.slice(0, SUGGESTED_PRODUCT_LIMIT)

  return (
    <main className="mx-auto max-w-400 px-6 pt-8 pb-24 lg:px-12 lg:pt-10 lg:pb-32">
      <header className="mx-auto max-w-2xl space-y-5 text-center lg:space-y-6">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[1.02] tracking-tight md:text-5xl lg:text-6xl">{t("title")}</h1>
        <p className="text-sm/relaxed text-muted-foreground md:text-base/relaxed">{t("description")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <LocalizedLink
            className="inline-flex h-12 items-center justify-center bg-primary px-8 text-[11px] tracking-[0.2em] text-primary-foreground uppercase transition-colors hover:bg-primary/90"
            to={ROUTES.COLLECTIONS}
          >
            {t("ctaCollections")}
          </LocalizedLink>
          <LocalizedLink
            className="inline-flex h-12 items-center justify-center border border-foreground/20 px-8 text-[11px] tracking-[0.2em] uppercase transition-colors hover:border-foreground/50"
            to={ROUTES.PRODUCTS}
          >
            {t("ctaProducts")}
          </LocalizedLink>
        </div>
      </header>

      {suggestedCollections.length > 0 && (
        <section className="mt-16 space-y-8 lg:mt-20">
          <div className="space-y-3">
            <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("collectionsEyebrow")}</p>
            <h2 className="font-serif text-3xl leading-tight tracking-tight md:text-4xl">{t("collectionsTitle")}</h2>
            <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("collectionsDescription")}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {suggestedCollections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        </section>
      )}

      {suggestedProducts.length > 0 && (
        <section className="mt-16 space-y-8 lg:mt-20">
          <div className="space-y-3">
            <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("productsEyebrow")}</p>
            <h2 className="font-serif text-3xl leading-tight tracking-tight md:text-4xl">{t("productsTitle")}</h2>
            <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("productsDescription")}</p>
          </div>
          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {suggestedProducts.map((product, index) => (
              <SuggestedProductCard key={product.id} index={index} product={product} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

const PRIORITY_IMAGE_COUNT = 3

const SUGGESTED_COLLECTION_LIMIT = 3

const SUGGESTED_PRODUCT_LIMIT = 3

type SuggestedProduct = Pick<Product["select"], "handle" | "id" | "subtitles" | "thumbnail" | "titles"> & {
  readonly variants?: readonly {
    readonly id: string
    readonly price: number
    readonly title: string
  }[]
}
