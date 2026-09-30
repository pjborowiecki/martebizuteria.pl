import { type JSX, useMemo } from "react"

import { useLocale } from "use-intl/react"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"
import {
  resolveCollectionDescription,
  resolveCollectionShortDescription,
  resolveCollectionTitle,
} from "~/src/modules/product-collection/product-collection.utils"

import { getProductImageUrl } from "~/src/lib/image"

import { AspectRatio } from "~/src/presentation/components/shadcn/aspect-ratio"

import { Image } from "~/src/presentation/components/custom/image"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const CollectionCard = ({
  collection,
}: Readonly<{
  collection: Pick<ProductCollection["select"], "descriptions" | "handle" | "id" | "image" | "shortDescriptions" | "titles">
}>): JSX.Element => {
  const locale = useLocale()
  const params = useMemo(
    () => ({
      handle: collection.handle,
    }),
    [collection.handle],
  )

  const title = resolveCollectionTitle(collection.titles, locale)
  const shortDescription = resolveCollectionShortDescription(collection.shortDescriptions, locale)
  const description = shortDescription === "" ? resolveCollectionDescription(collection.descriptions, locale) : shortDescription
  const imageSrc = getProductImageUrl(collection.image)

  return (
    <LocalizedLink className="group block" params={params} to={ROUTES.COLLECTION}>
      <AspectRatio className="overflow-hidden bg-secondary" ratio={ASPECT_RATIO_PORTRAIT}>
        <Image
          alt={title}
          className="absolute inset-0 size-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-transform group-hover:scale-[1.06]"
          height={1200}
          sizes="(max-width: 768px) 100vw, 33vw"
          src={imageSrc}
          width={960}
        />
      </AspectRatio>
      <div className="mt-5 space-y-2">
        <h2 className="font-serif text-xl leading-snug transition-colors duration-500 group-hover:text-muted-foreground lg:text-2xl">
          {title}
        </h2>
        {description !== "" && <p className="line-clamp-3 text-sm/relaxed text-muted-foreground">{description}</p>}
      </div>
    </LocalizedLink>
  )
}

const ASPECT_RATIO_PORTRAIT = 0.8
