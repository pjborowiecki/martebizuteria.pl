import { type JSX } from "react";

import { AspectRatio } from "~/src/components/shadcn/aspect-ratio";

import { Image } from "~/src/components/custom/image";
import { ProductBreadcrumb } from "~/src/components/custom/product-page/product-breadcrumb";
import { ProductHeroInfo } from "~/src/components/custom/product-page/product-hero-info";

import type { ProductData } from "~/src/data/product-data";

const INDEX_OFFSET = 1;
const FIRST_INDEX = 0;
const PRODUCT_IMAGE_ASPECT_RATIO = 0.8;

export interface ProductHeroSectionProps {
  readonly images: readonly string[];
  readonly product: ProductData;
}

export function ProductHeroSection({ images, product }: ProductHeroSectionProps): JSX.Element {
  return (
    <>
      <ProductBreadcrumb productTitle={product.title} />

      <section className="mx-auto max-w-400 px-6 pt-8 pb-16 lg:px-12 lg:pt-12 lg:pb-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
          <div className="reveal space-y-3 lg:space-y-4">
            {images.map((src, i) => (
              <AspectRatio className="overflow-hidden bg-secondary" key={src} ratio={PRODUCT_IMAGE_ASPECT_RATIO}>
                <Image
                  alt={`${product.title} — ${i + INDEX_OFFSET}`}
                  className="absolute inset-0 size-full object-cover"
                  height={1400}
                  priority={i === FIRST_INDEX}
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  src={src}
                  width={1120}
                />
              </AspectRatio>
            ))}
          </div>

          <ProductHeroInfo product={product} />
        </div>
      </section>
    </>
  );
}
