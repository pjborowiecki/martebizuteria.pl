import { type JSX, useCallback, useEffect, useMemo, useState } from "react"

import { cn } from "cn"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { AspectRatio } from "~/src/presentation/components/shadcn/aspect-ratio"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from "~/src/presentation/components/shadcn/carousel"

import { Image } from "~/src/presentation/components/custom/image"

const ProductHeroImage = ({
  alt,
  priority,
  sizes,
  src,
}: Readonly<{
  alt: string
  priority: boolean
  sizes: string
  src: string
}>): JSX.Element => (
  <AspectRatio className="overflow-hidden bg-secondary" ratio={PRODUCT_IMAGE_ASPECT_RATIO}>
    <Image
      alt={alt}
      className="absolute inset-0 size-full object-cover"
      height={1400}
      priority={priority}
      sizes={sizes}
      src={src}
      width={1120}
    />
  </AspectRatio>
)

const ProductHeroCarouselDot = ({
  api,
  index,
  selectedIndex,
}: Readonly<{
  api: CarouselApi | undefined
  index: number
  selectedIndex: number
}>): JSX.Element => {
  const handleDotClick = useCallback(() => {
    api?.scrollTo(index)
  }, [api, index])

  return (
    <button
      type="button"
      aria-label={`Image ${index + 1}`}
      aria-current={selectedIndex === index ? "true" : undefined}
      onClick={handleDotClick}
      className={cn("size-1.5 rounded-full transition-colors", selectedIndex === index ? "bg-foreground" : "bg-foreground/25")}
    />
  )
}

const ProductHeroCarouselDots = ({
  api,
  count,
}: Readonly<{
  api: CarouselApi | undefined
  count: number
}>): JSX.Element | undefined => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  useEffect(() => {
    if (api === undefined) {
      return
    }

    const handleSelect = (): void => {
      setSelectedIndex(api.selectedScrollSnap())
    }
    handleSelect()
    api.on("select", handleSelect)
    api.on("reInit", handleSelect)

    return function unsubscribeFromCarouselSelection() {
      api.off("select", handleSelect)
      api.off("reInit", handleSelect)
    }
  }, [api])

  if (count <= 1) {
    return undefined
  }

  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      {Array.from(
        {
          length: count,
        },
        (_, index) => (
          <ProductHeroCarouselDot api={api} index={index} key={index} selectedIndex={selectedIndex} />
        ),
      )}
    </div>
  )
}

const ProductHeroMobileCarousel = ({ images, title }: Readonly<ProductHeroGalleryProps>): JSX.Element => {
  const [api, setApi] = useState<CarouselApi | undefined>()
  const handleSetApi = useCallback((carouselApi: CarouselApi) => {
    setApi(carouselApi)
  }, [])

  const scrollPrev = useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = useCallback(() => {
    api?.scrollNext()
  }, [api])

  const carouselOpts = useMemo(() => CAROUSEL_LOOP_OPTS, [])
  const [firstImage] = images
  if (images.length === 1 && firstImage !== undefined) {
    return (
      <div className="reveal lg:hidden">
        <ProductHeroImage alt={title} priority sizes="100vw" src={firstImage} />
      </div>
    )
  }

  return (
    <div className="reveal lg:hidden">
      <Carousel className="relative" opts={carouselOpts} setApi={handleSetApi}>
        <CarouselContent className="ml-0">
          {images.map((src, index) => (
            <CarouselItem key={src} className="pl-0">
              <ProductHeroImage alt={title} priority={index === 0} sizes="100vw" src={src} />
            </CarouselItem>
          ))}
        </CarouselContent>

        <Button
          className="absolute top-1/2 left-3 size-10 -translate-y-1/2 rounded-none border-0 bg-background/85 shadow-none backdrop-blur-sm hover:bg-background"
          onClick={scrollPrev}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          className="absolute top-1/2 right-3 size-10 -translate-y-1/2 rounded-none border-0 bg-background/85 shadow-none backdrop-blur-sm hover:bg-background"
          onClick={scrollNext}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <ChevronRightIcon />
        </Button>

        <ProductHeroCarouselDots api={api} count={images.length} />
      </Carousel>
    </div>
  )
}

export const ProductHeroGallery = ({ images, title }: Readonly<ProductHeroGalleryProps>): JSX.Element => (
  <div className="min-w-0">
    <ProductHeroMobileCarousel images={images} title={title} />

    <div className="reveal hidden space-y-3 lg:block lg:space-y-4">
      {images.map((src, index) => (
        <ProductHeroImage key={src} alt={title} priority={index === 0} sizes="(max-width: 1024px) 100vw, 58vw" src={src} />
      ))}
    </div>
  </div>
)

const PRODUCT_IMAGE_ASPECT_RATIO = 0.8

const CAROUSEL_LOOP_OPTS = {
  loop: true,
} as const

interface ProductHeroGalleryProps {
  readonly images: readonly string[]
  readonly title: string
}
