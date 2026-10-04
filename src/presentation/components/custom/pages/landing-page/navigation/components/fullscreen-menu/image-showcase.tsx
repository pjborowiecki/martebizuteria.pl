import { type JSX, useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { getCollectionsQuery } from "~/src/modules/product-collection/use-cases/get-collections"

import { getProductImageUrl } from "~/src/lib/image"

import { Image } from "~/src/presentation/components/custom/image"
import { useNavigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider"
import { PRIMARY, type PrimaryItem } from "~/src/presentation/components/custom/pages/landing-page/navigation/constants"

const resolveShowcaseImage = (item: PrimaryItem, collectionImages: ReadonlyMap<string, string | null>): string =>
  getProductImageUrl("collectionHandle" in item ? collectionImages.get(item.collectionHandle) : item.image)

export const ImageShowcase = (): JSX.Element => {
  const t = useTranslations("components.custom.navigation")
  const { mounted } = useNavigation()
  const { data: collections } = useQuery(getCollectionsQuery())
  const collectionImages = useMemo(() => new Map(collections?.map((collection) => [collection.handle, collection.image])), [collections])
  const containerStyle = useMemo(() => ({ perspective: "1000px" }), [])
  const activeStyle = useMemo(() => ({ opacity: 1, visibility: "inherit" as const }), [])
  const inactiveStyle = useMemo(() => ({ opacity: 0, visibility: "hidden" as const }), [])

  return (
    <div className="hidden w-1/2 items-center justify-center py-12 pr-12 lg:flex">
      <div
        data-menu-image-container
        className="relative aspect-3/4 w-[80%] max-w-md overflow-hidden rounded-sm shadow-2xl ring-1 ring-white/10"
        style={containerStyle}
      >
        {PRIMARY.map((item, index) => (
          <div
            key={item.hash}
            data-menu-image={index}
            className="absolute inset-0"
            style={index === ACTIVE_INDEX ? activeStyle : inactiveStyle}
          >
            {mounted && (
              <Image
                alt={t("menu.imageAlt")}
                className="absolute inset-0 h-full w-full object-cover object-center"
                height={1200}
                priority={index === ACTIVE_INDEX}
                sizes="(max-width: 1024px) 0vw, 40vw"
                src={resolveShowcaseImage(item, collectionImages)}
                width={900}
              />
            )}
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-primary/10" />
          </div>
        ))}
      </div>
    </div>
  )
}

const ACTIVE_INDEX = 0
