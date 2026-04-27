import { type JSX, useMemo } from "react";

import { Image as UnpicImage } from "@unpic/react";

import { IMAGE_CONSTANTS, getOptimizedImageUrl } from "~/src/lib/utils";

export interface CustomImageProps {
  readonly alt: string;
  readonly blurDataURL?: string | null;
  readonly className?: string;
  readonly decoding?: "async" | "auto" | "sync";
  readonly height: number;
  readonly loading?: "eager" | "lazy";
  readonly quality?: number;
  readonly src: string;
  readonly width: number;
}

export function Image({
  alt,
  blurDataURL,
  className,
  decoding = "async",
  height,
  loading = "eager",
  quality,
  src,
  width
}: Readonly<CustomImageProps>): JSX.Element {
  const optimizedSrc = useMemo<string>(() => {
    let targetQuality = IMAGE_CONSTANTS.DEFAULT_QUALITY;
    if (quality !== undefined) {
      targetQuality = quality;
    }

    return getOptimizedImageUrl({
      height,
      quality: targetQuality,
      src,
      width
    });
  }, [height, quality, src, width]);

  let finalBackground: string | undefined = undefined;
  if (typeof blurDataURL === "string") {
    finalBackground = blurDataURL;
  }

  return (
    <UnpicImage
      alt={alt}
      background={finalBackground}
      className={className}
      decoding={decoding}
      height={height}
      loading={loading}
      src={optimizedSrc}
      width={width}
    />
  );
}
