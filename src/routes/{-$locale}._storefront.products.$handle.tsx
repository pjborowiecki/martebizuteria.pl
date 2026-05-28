import { type JSX, Suspense, useMemo, useRef } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Await, createFileRoute, defer, notFound } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { getProductImageUrl, prefetchSingleProductImage } from "~/src/lib/_utils/image";

import { ProductHeroSection } from "~/src/components/custom/pages/product-page/sections/product-hero-section";
import { ProductParallaxSection } from "~/src/components/custom/pages/product-page/sections/product-parallax-section";
import { ProductRelatedSection } from "~/src/components/custom/pages/product-page/sections/product-related-section";

import { PRODUCT_GALLERY_MOCK } from "~/src/data/product-data";
import { useProductAnimations } from "~/src/hooks/use-product-animations";
import { productQueryOptions } from "~/src/modules/product/product.queries";
import type { Product } from "~/src/modules/product/product.types";

const FIRST_IMAGE_INDEX = 0;
const PARALLAX_IMAGE_INDEX = 2;
const EMPTY_LENGTH = 0;
const FIRST_VARIANT_INDEX = 0;

export const Route = createFileRoute("/{-$locale}/_storefront/products/$handle")({
  component: ProductPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<{ description?: string | null; title: string }> }>) => ({
    meta: [
      { title: `${loaderData?.title ?? "Product"} | ${CONSTANTS.APP_NAME}` },
      { content: loaderData?.description ?? "", name: "description" }
    ]
  }),
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQueryOptions.productQueryOptions(params.handle));
    if (data === false) {
      notFound({ throw: true });
      return { deferredRelated: undefined, description: "", title: "" };
    }

    prefetchSingleProductImage(data, context.imagePrefetchService);

    const deferredRelated = defer(context.queryClient.fetchQuery(productQueryOptions.relatedProductsQueryOptions(data.categoryId)));

    return { deferredRelated, description: data.description, title: data.title };
  }
});

function ProductPage(): JSX.Element {
  const { handle } = Route.useParams();
  const { deferredRelated } = Route.useLoaderData();

  const { data: product } = useSuspenseQuery(productQueryOptions.productQueryOptions(handle));

  const t = useTranslations("productPage");
  const rootRef = useRef<HTMLDivElement>(null);

  useProductAnimations({ rootRef });

  const images = useMemo(() => {
    if (product === false) {
      return PRODUCT_GALLERY_MOCK;
    }
    const productImages = product.images ?? [];
    if (productImages.length === EMPTY_LENGTH) {
      return [getProductImageUrl(product.thumbnail)];
    }
    return productImages.map((src) => getProductImageUrl(src));
  }, [product]);

  const fallback = useMemo(
    () => <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">{t("loadingRelated")}</div>,
    [t]
  );

  if (product === false) {
    return <div>{t("notFound")}</div>;
  }

  return (
    <main className="bg-background text-foreground" ref={rootRef}>
      <ProductHeroSection images={images} product={product} />
      <ProductParallaxSection imageSrc={images[PARALLAX_IMAGE_INDEX] ?? images[FIRST_IMAGE_INDEX] ?? ""} productTitle={product.title} />

      {deferredRelated !== undefined && (
        <Suspense fallback={fallback}>
          <Await promise={deferredRelated}>{(relatedProducts) => <MappedRelatedProducts relatedProducts={relatedProducts} />}</Await>
        </Suspense>
      )}
    </main>
  );
}

type RelatedProduct = Pick<Product["select"], "description" | "handle" | "thumbnail" | "title"> & {
  readonly variants?: readonly { readonly price: number }[];
};

function MappedRelatedProducts({ relatedProducts }: Readonly<{ relatedProducts: readonly RelatedProduct[] }>): JSX.Element {
  const mappedProducts = useMemo(
    () =>
      relatedProducts.map((p) => ({
        detailKey: p.description ?? "",
        image: getProductImageUrl(p.thumbnail),
        nameKey: p.title,
        params: { handle: p.handle },
        price: p.variants?.[FIRST_VARIANT_INDEX]?.price
      })),
    [relatedProducts]
  );
  return <ProductRelatedSection products={mappedProducts} />;
}
