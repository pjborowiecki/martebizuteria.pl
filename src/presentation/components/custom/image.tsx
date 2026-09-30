import { type JSX, useMemo } from "react"

import { Image as UnpicImage } from "@unpic/react"

import { IMAGE_CONSTANTS, getOptimizedImageUrl } from "~/src/lib/image"
import { resolveAssetURL } from "~/src/lib/url"

export const Image = ({
  alt,
  blurDataURL,
  className,
  decoding = "async",
  height,
  loading,
  optimize = true,
  priority = false,
  quality,
  sizes,
  src,
  width,
}: Readonly<CustomImageProps>): JSX.Element => {
  const optimizedSrc = useMemo<string>(() => {
    if (!optimize) {
      return resolveAssetURL(src)
    }

    let targetQuality = IMAGE_CONSTANTS.DEFAULT_QUALITY
    if (quality !== undefined) {
      targetQuality = quality
    } else if (priority) {
      targetQuality = IMAGE_CONSTANTS.HIGH_QUALITY
    }

    return getOptimizedImageUrl({
      height,
      quality: targetQuality,
      src,
      width,
    })
  }, [height, optimize, priority, quality, src, width])

  let resolvedLoading: "eager" | "lazy" = "lazy"
  if (priority) {
    resolvedLoading = "eager"
  } else if (loading !== undefined) {
    resolvedLoading = loading
  }

  return (
    <UnpicImage
      alt={alt}
      className={className}
      decoding={priority ? "sync" : decoding}
      fetchPriority={priority ? "high" : undefined}
      height={height}
      loading={resolvedLoading}
      sizes={sizes}
      src={optimizedSrc}
      width={width}
      {...(typeof blurDataURL === "string" ? { background: blurDataURL } : {})}
    />
  )
}

interface CustomImageProps {
  readonly alt: string
  readonly blurDataURL?: string | null
  readonly className?: string
  readonly decoding?: "async" | "auto" | "sync"
  readonly height: number
  readonly loading?: "eager" | "lazy"
  readonly optimize?: boolean
  readonly priority?: boolean
  readonly quality?: number
  readonly sizes?: string
  readonly src: string
  readonly width: number
}
