import { createIsomorphicFn } from "@tanstack/react-start";
import { transformUrl } from "unpic";

import { getAssetURL } from "~/src/lib/_utils/url";
import { getBaseURL } from "~/src/lib/utils";

import type { Product } from "~/src/modules/product/product.types";

const DEFAULT_EAGER_COUNT = 6;
const MAX_CACHE_SIZE = 1000;

export const IMAGE_CONSTANTS = {
  CDN_DOMAIN: "tanstack-faster.tancn.dev",
  DEFAULT_HEIGHT: 256,
  DEFAULT_QUALITY: 75,
  DEFAULT_WIDTH: 256,
  HIGH_QUALITY: 75,
  LARGE_HEIGHT: 512,
  LARGE_WIDTH: 512,
  LOW_QUALITY: 60,
  ONE: 1,
  THUMBNAIL_HEIGHT: 256,
  THUMBNAIL_WIDTH: 256,
  ZERO: 0
};

try {
  IMAGE_CONSTANTS.CDN_DOMAIN = new URL(getBaseURL()).hostname;
} catch {
  // Silent fallback
}

const viteDomain: unknown = import.meta.env.VITE_IMAGE_CDN_DOMAIN;
if (typeof viteDomain === "string" && viteDomain.length > IMAGE_CONSTANTS.ZERO) {
  IMAGE_CONSTANTS.CDN_DOMAIN = viteDomain;
}

// Placeholder asset that lives in the R2 bucket.
export const PLACEHOLDER_IMAGE = getAssetURL("placeholder.svg");

// TEMPORARY: dynamic product/category/collection media has not been uploaded to
// R2 yet, so the thumbnails stored in the DB resolve to 404s. Until real assets
// exist, every DB-sourced image renders the bucket's placeholder. Once media is
// live, change the body to `src !== undefined && src !== null && src !== "" ? src : PLACEHOLDER_IMAGE`.
export function getProductImageUrl(_src?: string | null): string {
  return PLACEHOLDER_IMAGE;
}

export interface PrefetchImageConfig {
  readonly alt?: string | null;
  readonly loading?: "eager" | "lazy";
  readonly quality?: number;
  readonly sizes?: string | null;
  readonly src: string;
  readonly srcset?: string | null;
  readonly width?: number;
}

export interface PrefetchRawConfig {
  readonly height: number;
  readonly quality?: number;
  readonly width: number;
}

export class ImagePrefetchService {
  private readonly maxSize: number;

  private readonly seen: Set<string>;

  constructor(maxSize = MAX_CACHE_SIZE) {
    this.seen = new Set<string>();
    this.maxSize = maxSize;
  }

  public clear(): void {
    this.seen.clear();
  }

  public getSize(): number {
    return this.seen.size;
  }

  public isSeen(src: string): boolean {
    return this.seen.has(src);
  }

  public markSeen(src: string): void {
    if (!this.seen.has(src)) {
      this.seen.add(src);

      if (this.seen.size > this.maxSize) {
        const oldestEntry = this.seen.values().next().value;
        if (oldestEntry !== undefined) {
          this.seen.delete(oldestEntry);
        }
      }
    }
  }
}

export function getOptimizedImageUrl({
  height,
  quality,
  src,
  width
}: Readonly<{ height: number; quality: number | undefined; src: string; width: number }>): string {
  try {
    if (src.startsWith("http://") || src.startsWith("https://")) {
      const url = new URL(src);
      if (url.hostname === "images.unsplash.com" || url.hostname.endsWith(".unsplash.com") || url.hostname.endsWith(".r2.dev")) {
        return src;
      }
    }

    let resolvedQuality = IMAGE_CONSTANTS.DEFAULT_QUALITY;
    if (quality !== undefined) {
      resolvedQuality = quality;
    }

    const optimized: unknown = transformUrl(
      {
        height,
        provider: "cloudflare",
        quality: resolvedQuality,
        url: src,
        width
      },
      {
        cloudflare: {
          f: "auto",
          format: "auto"
        }
      },
      {
        cloudflare: {
          domain: IMAGE_CONSTANTS.CDN_DOMAIN
        }
      }
    );
    if (typeof optimized === "string") {
      return optimized;
    }
    return src;
  } catch {
    return src;
  }
}

function preloadSingleImage(image: Readonly<PrefetchImageConfig>, prefetchService: Readonly<ImagePrefetchService>): void {
  const img = new Image();
  img.decoding = "async";
  img.fetchPriority = "low";

  if (image.sizes !== undefined && image.sizes !== null) {
    img.sizes = image.sizes;
  }
  if (image.srcset !== undefined && image.srcset !== null) {
    img.srcset = image.srcset;
  }

  prefetchService.markSeen(image.src);
  img.src = image.src;
}

export function executeDomPrefetch(
  images: readonly PrefetchImageConfig[] | undefined,
  prefetchService: Readonly<ImagePrefetchService>
): void {
  if (images === undefined || images.length === IMAGE_CONSTANTS.ZERO) {
    return;
  }

  for (const image of images) {
    if (image.loading !== "lazy" && !prefetchService.isSeen(image.src)) {
      preloadSingleImage(image, prefetchService);
    }
  }
}

export const prefetchProductThumbnails = createIsomorphicFn().client(
  (products: readonly Readonly<Product["select"]>[], prefetchService: Readonly<ImagePrefetchService>) => {
    let count = IMAGE_CONSTANTS.ZERO;
    const images: PrefetchImageConfig[] = products
      .filter((product) => typeof product.thumbnail === "string")
      .map((product) => {
        let loading: "eager" | "lazy" = "lazy";
        if (count < DEFAULT_EAGER_COUNT) {
          loading = "eager";
        }
        count += IMAGE_CONSTANTS.ONE;

        return {
          alt: product.title,
          loading,
          quality: IMAGE_CONSTANTS.LOW_QUALITY,
          src: getOptimizedImageUrl({
            height: IMAGE_CONSTANTS.THUMBNAIL_HEIGHT,
            quality: IMAGE_CONSTANTS.LOW_QUALITY,
            src: String(product.thumbnail),
            width: IMAGE_CONSTANTS.THUMBNAIL_WIDTH
          }),
          width: IMAGE_CONSTANTS.THUMBNAIL_WIDTH
        };
      });

    executeDomPrefetch(images, prefetchService);
  }
);

export const prefetchSingleProductImage = createIsomorphicFn().client(
  (product: Readonly<Product["select"]>, prefetchService: Readonly<ImagePrefetchService>) => {
    if (typeof product.thumbnail === "string") {
      const images: PrefetchImageConfig[] = [
        {
          alt: product.title,
          loading: "eager",
          quality: IMAGE_CONSTANTS.HIGH_QUALITY,
          src: getOptimizedImageUrl({
            height: IMAGE_CONSTANTS.LARGE_HEIGHT,
            quality: IMAGE_CONSTANTS.HIGH_QUALITY,
            src: product.thumbnail,
            width: IMAGE_CONSTANTS.LARGE_WIDTH
          }),
          width: IMAGE_CONSTANTS.LARGE_WIDTH
        }
      ];

      executeDomPrefetch(images, prefetchService);
    }
  }
);

export const prefetchRawImageUrls = createIsomorphicFn().client(
  (imageUrls: readonly string[], prefetchService: Readonly<ImagePrefetchService>, config: Readonly<PrefetchRawConfig> | undefined) => {
    let count = IMAGE_CONSTANTS.ZERO;
    const {
      height = IMAGE_CONSTANTS.DEFAULT_HEIGHT,
      quality = IMAGE_CONSTANTS.DEFAULT_QUALITY,
      width = IMAGE_CONSTANTS.DEFAULT_WIDTH
    } = config ?? {};

    const images: PrefetchImageConfig[] = imageUrls.map((url) => {
      let loading: "eager" | "lazy" = "lazy";
      if (count < DEFAULT_EAGER_COUNT) {
        loading = "eager";
      }
      count += IMAGE_CONSTANTS.ONE;

      return {
        loading,
        quality,
        src: getOptimizedImageUrl({ height, quality, src: url, width }),
        width
      };
    });

    executeDomPrefetch(images, prefetchService);
  }
);
