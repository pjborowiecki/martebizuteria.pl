import { type JSX, Suspense, useMemo, useRef } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Await, createFileRoute, defer, notFound } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { prefetchSingleProductImage } from "~/src/lib/_utils/image";

import { ProductHeroSection } from "~/src/components/custom/product-page/sections/product-hero-section";
import { ProductParallaxSection } from "~/src/components/custom/product-page/sections/product-parallax-section";
import { ProductRelatedSection } from "~/src/components/custom/product-page/sections/product-related-section";

import { PRODUCT_GALLERY_MOCK, PRODUCT_RELATED_MOCK } from "~/src/data/product-data";
import { useProductAnimations } from "~/src/hooks/use-product-animations";
import { productQueryOptions } from "~/src/modules/product/product.queries";

const FIRST_IMAGE_INDEX = 0;
const PARALLAX_IMAGE_INDEX = 2;
const SLICE_START_INDEX = 1;

export const Route = createFileRoute("/{-$locale}/products/$handle")({
  component: ProductPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<{ description?: string | null; title: string }> }>) => ({
    meta: [
      { title: `${loaderData?.title ?? "Product"} | ${CONSTANTS.APP_NAME}` },
      { content: loaderData?.description ?? "", name: "description" }
    ]
  }),
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQueryOptions(params.handle));
    if (data === false) {
      notFound({ throw: true });
      return { deferredRelated: undefined, description: "", title: "" };
    }

    prefetchSingleProductImage(data, context.imagePrefetchService);

    const fetchRelatedMock = () => Promise.resolve(PRODUCT_RELATED_MOCK);
    const deferredRelated = defer(fetchRelatedMock());

    return { deferredRelated, description: data.description, title: data.title };
  }
});

function ProductPage(): JSX.Element {
  const { handle } = Route.useParams();
  const { deferredRelated } = Route.useLoaderData();

  const { data: product } = useSuspenseQuery(productQueryOptions(handle));

  const t = useTranslations("productPage");
  const rootRef = useRef<HTMLDivElement>(null);

  useProductAnimations({ rootRef });

  const images = useMemo(() => {
    if (product === false) {
      return PRODUCT_GALLERY_MOCK;
    }
    return product.thumbnail === null ? PRODUCT_GALLERY_MOCK : [product.thumbnail, ...PRODUCT_GALLERY_MOCK.slice(SLICE_START_INDEX)];
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
          <Await promise={deferredRelated}>{(relatedProducts) => <ProductRelatedSection products={relatedProducts} />}</Await>
        </Suspense>
      )}
    </main>
  );
}
