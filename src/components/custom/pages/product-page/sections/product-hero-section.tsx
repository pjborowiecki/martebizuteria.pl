import { type JSX, useMemo } from "react";

import { getProductImageUrl } from "~/src/lib/_utils/image";

import { ProductBreadcrumb } from "~/src/components/custom/pages/product-page/product-breadcrumb";
import { ProductHeroGallery } from "~/src/components/custom/pages/product-page/product-hero-gallery";
import { ProductHeroInfo } from "~/src/components/custom/pages/product-page/product-hero-info";
import { useSelectedProductVariant } from "~/src/components/custom/pages/product-page/use-selected-product-variant";

import type { StorefrontProduct } from "~/src/modules/product/product.types";

const EMPTY_LENGTH = 0;

export interface ProductHeroSectionProps {
  readonly product: StorefrontProduct;
}

export function ProductHeroSection({ product }: ProductHeroSectionProps): JSX.Element {
  const { selectOptionValue, selectedValueIds, selectedVariant } = useSelectedProductVariant(product);

  const images = useMemo(() => {
    const variantImages = selectedVariant?.imageUrls ?? [];
    let sourceUrls = product.imageUrls;

    if (variantImages.length > EMPTY_LENGTH) {
      sourceUrls = variantImages;
    } else if (product.sharedImageUrls.length > EMPTY_LENGTH) {
      sourceUrls = product.sharedImageUrls;
    }

    if (sourceUrls.length === EMPTY_LENGTH) {
      return [getProductImageUrl(product.thumbnail)];
    }

    return sourceUrls.map((src) => getProductImageUrl(src));
  }, [product, selectedVariant]);

  return (
    <>
      <ProductBreadcrumb productTitle={product.title} />

      <section className="mx-auto max-w-400 px-6 pt-8 pb-28 lg:px-12 lg:pt-12 lg:pb-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
          <ProductHeroGallery images={images} title={product.title} />

          <ProductHeroInfo
            onSelectOptionValue={selectOptionValue}
            product={product}
            selectedValueIds={selectedValueIds}
            selectedVariant={selectedVariant}
          />
        </div>
      </section>
    </>
  );
}
