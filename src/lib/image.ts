import { createIsomorphicFn } from "@tanstack/react-start"
import { transformUrl } from "unpic"

import { type Product } from "~/src/modules/product/product.types"

import { getAssetURL, isAssetCdnUrl, resolveAssetURL } from "~/src/lib/url"

import { APP_URL } from "~/src/presentation/branding/app"

const resolveImageCdnDomain = (): string => {
  const domain: unknown = import.meta.env["VITE_IMAGE_CDN_DOMAIN"]

  return typeof domain === "string" && domain !== "" ? domain : new URL(APP_URL).hostname
}

const resolveImageTransformation = (resolvedSrc: string): Readonly<{ domain: string; source: string }> | undefined => {
  if (!resolvedSrc.startsWith("http://") && !resolvedSrc.startsWith("https://")) {
    return { domain: resolveImageCdnDomain(), source: resolvedSrc }
  }

  const url = new URL(resolvedSrc)
  if (UNTRANSFORMED_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))) {
    return undefined
  }

  return isAssetCdnUrl(resolvedSrc)
    ? { domain: url.hostname, source: url.pathname }
    : { domain: resolveImageCdnDomain(), source: resolvedSrc }
}

export const getProductImageUrl = (src?: string | null): string =>
  src !== undefined && src !== null && src !== "" ? src : PLACEHOLDER_IMAGE

export const getOptimizedImageUrl = ({
  height,
  quality,
  src,
  width,
}: Readonly<{
  height: number
  quality: number | undefined
  src: string
  width: number
}>): string => {
  const resolvedSrc = resolveAssetURL(src)
  try {
    const transformation = resolveImageTransformation(resolvedSrc)
    if (transformation === undefined) {
      return resolvedSrc
    }

    const optimized: unknown = transformUrl(
      {
        height,
        provider: "cloudflare",
        quality: quality ?? IMAGE_CONSTANTS.DEFAULT_QUALITY,
        url: transformation.source,
        width,
      },
      {
        cloudflare: {
          f: "auto",
          format: "auto",
          onerror: "redirect",
        },
      },
      {
        cloudflare: {
          domain: transformation.domain,
        },
      },
    )

    if (typeof optimized === "string") {
      return optimized
    }

    return resolvedSrc
  } catch {
    return resolvedSrc
  }
}

const preloadSingleImage = (image: Readonly<PrefetchImageConfig>, prefetchService: Readonly<ImagePrefetchService>): void => {
  if (prefetchService.isSeen(image.src)) {
    return
  }

  const img = new Image()
  img.decoding = "async"
  img.fetchPriority = "low"
  if (image.sizes !== undefined && image.sizes !== null) {
    img.sizes = image.sizes
  }

  if (image.srcset !== undefined && image.srcset !== null) {
    img.srcset = image.srcset
  }
  prefetchService.markSeen(image.src)
  img.src = image.src
}

export const executeDomPrefetch = (
  images: readonly PrefetchImageConfig[] | undefined,
  prefetchService: Readonly<ImagePrefetchService>,
): void => {
  if (images === undefined || images.length === 0) {
    return
  }

  for (const image of images) {
    if (image.loading !== "lazy") {
      preloadSingleImage(image, prefetchService)
    }
  }
}

const UNTRANSFORMED_HOST_SUFFIXES = [".unsplash.com", ".r2.dev"]

const DEFAULT_EAGER_COUNT = 6

const MAX_CACHE_SIZE = 1000

export const IMAGE_CONSTANTS = {
  DEFAULT_HEIGHT: 256,
  DEFAULT_QUALITY: 75,
  DEFAULT_WIDTH: 256,
  HIGH_QUALITY: 75,
  LARGE_HEIGHT: 512,
  LARGE_WIDTH: 512,
  LOW_QUALITY: 60,
  THUMBNAIL_HEIGHT: 256,
  THUMBNAIL_WIDTH: 256,
}

export const PLACEHOLDER_IMAGE = getAssetURL("placeholder.svg")

export interface PrefetchImageConfig {
  readonly alt?: string | null
  readonly loading?: "eager" | "lazy"
  readonly quality?: number
  readonly sizes?: string | null
  readonly src: string
  readonly srcset?: string | null
  readonly width?: number
}

export interface PrefetchRawConfig {
  readonly height: number
  readonly quality?: number
  readonly width: number
}

export class ImagePrefetchService {
  private readonly maxSize: number
  private readonly seen: Set<string>
  constructor(maxSize = MAX_CACHE_SIZE) {
    this.seen = new Set<string>()
    this.maxSize = maxSize
  }
  public clear(): void {
    this.seen.clear()
  }
  public getSize(): number {
    return this.seen.size
  }
  public isSeen(src: string): boolean {
    return this.seen.has(src)
  }
  public markSeen(src: string): void {
    if (this.seen.has(src)) {
      return
    }

    for (const oldestEntry of this.seen) {
      if (this.seen.size < this.maxSize) {
        break
      }
      this.seen.delete(oldestEntry)
    }
    this.seen.add(src)
  }
}

export const prefetchProductThumbnails = createIsomorphicFn().client(
  (
    products: readonly Readonly<{
      thumbnail: string | null
    }>[],
    prefetchService: Readonly<ImagePrefetchService>,
  ) => {
    let count = 0
    for (const product of products) {
      const thumbnail = getProductImageUrl(product.thumbnail)
      if (thumbnail !== PLACEHOLDER_IMAGE) {
        preloadSingleImage(
          {
            src: getOptimizedImageUrl({
              height: IMAGE_CONSTANTS.THUMBNAIL_HEIGHT,
              quality: IMAGE_CONSTANTS.LOW_QUALITY,
              src: thumbnail,
              width: IMAGE_CONSTANTS.THUMBNAIL_WIDTH,
            }),
          },
          prefetchService,
        )
        count++
      }

      if (count === DEFAULT_EAGER_COUNT) {
        break
      }
    }
  },
)

export const prefetchSingleProductImage = createIsomorphicFn().client(
  (
    product: Readonly<{
      thumbnail: string | null
      title?: string
      titles?: Product["localeMap"] | null
    }>,
    prefetchService: Readonly<ImagePrefetchService>,
  ) => {
    const thumbnail = getProductImageUrl(product.thumbnail)
    if (thumbnail !== PLACEHOLDER_IMAGE) {
      preloadSingleImage(
        {
          src: getOptimizedImageUrl({
            height: IMAGE_CONSTANTS.LARGE_HEIGHT,
            quality: IMAGE_CONSTANTS.HIGH_QUALITY,
            src: thumbnail,
            width: IMAGE_CONSTANTS.LARGE_WIDTH,
          }),
        },
        prefetchService,
      )
    }
  },
)

export const prefetchRawImageUrls = createIsomorphicFn().client(
  (imageUrls: readonly string[], prefetchService: Readonly<ImagePrefetchService>, config: Readonly<PrefetchRawConfig> | undefined) => {
    const {
      height = IMAGE_CONSTANTS.DEFAULT_HEIGHT,
      quality = IMAGE_CONSTANTS.DEFAULT_QUALITY,
      width = IMAGE_CONSTANTS.DEFAULT_WIDTH,
    } = config ?? {}

    const images = imageUrls.slice(0, DEFAULT_EAGER_COUNT).map((src) => ({
      src: getOptimizedImageUrl({
        height,
        quality,
        src,
        width,
      }),
    }))
    executeDomPrefetch(images, prefetchService)
  },
)
