import { type JSX, Suspense, useMemo, useRef } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Await, createFileRoute, defer, notFound } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import { getProductImageUrl, prefetchSingleProductImage } from "~/src/lib/_utils/image";
import { isValidLocale } from "~/src/lib/utils";

import { ProductHeroSection } from "~/src/components/custom/pages/product-page/sections/product-hero-section";
import { ProductRelatedSection } from "~/src/components/custom/pages/product-page/sections/product-related-section";

import { useProductAnimations } from "~/src/hooks/use-product-animations";
import { productQueryOptions } from "~/src/modules/product/product.queries";
import type { Product } from "~/src/modules/product/product.types";
import { resolveProductSubtitle, resolveProductTitle } from "~/src/modules/product/product.utils";

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
    const locale = params.locale !== undefined && isValidLocale(params.locale) ? params.locale : DEFAULT_LOCALE;
    const data = await context.queryClient.ensureQueryData(productQueryOptions.productQueryOptions(params.handle, locale));
    if (data === false) {
      notFound({ throw: true });
      return { deferredRelated: undefined, description: "", title: "" };
    }

    prefetchSingleProductImage(data, context.imagePrefetchService);

    const deferredRelated = defer(
      context.queryClient.fetchQuery(productQueryOptions.relatedProductsQueryOptions(data.categoryId, data.id, locale))
    );

    return { deferredRelated, description: data.description, title: data.title };
  }
});

function ProductPage(): JSX.Element {
  const { handle, locale: routeLocale } = Route.useParams();
  const locale = routeLocale !== undefined && isValidLocale(routeLocale) ? routeLocale : DEFAULT_LOCALE;
  const { deferredRelated } = Route.useLoaderData();

  const { data: product } = useSuspenseQuery(productQueryOptions.productQueryOptions(handle, locale));

  const t = useTranslations("pages.product");
  const rootRef = useRef<HTMLDivElement>(null);

  useProductAnimations({ dependencies: [handle], rootRef });

  const fallback = useMemo(
    () => <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">{t("loadingRelated")}</div>,
    [t]
  );

  if (product === false) {
    return <div>{t("notFound")}</div>;
  }

  return (
    <main className="bg-background text-foreground" ref={rootRef}>
      <ProductHeroSection product={product} />

      {deferredRelated !== undefined && (
        <Suspense fallback={fallback}>
          <Await promise={deferredRelated}>{(relatedProducts) => <MappedRelatedProducts relatedProducts={relatedProducts} />}</Await>
        </Suspense>
      )}
    </main>
  );
}

type RelatedProduct = Pick<Product["select"], "handle" | "id" | "subtitles" | "thumbnail" | "titles"> & {
  readonly variants?: readonly { readonly id: string; readonly price: number; readonly title: string }[];
};

function MappedRelatedProducts({ relatedProducts }: Readonly<{ relatedProducts: readonly RelatedProduct[] }>): JSX.Element {
  const { locale } = Route.useParams();
  const resolvedLocale = locale !== undefined && isValidLocale(locale) ? locale : DEFAULT_LOCALE;
  const mappedProducts = useMemo(
    () =>
      relatedProducts.map((product) => {
        const variant = product.variants?.[FIRST_VARIANT_INDEX];

        return {
          handle: product.handle,
          id: product.id,
          image: getProductImageUrl(product.thumbnail),
          name: resolveProductTitle(product.titles, resolvedLocale),
          subtitle: resolveProductSubtitle(product.subtitles, resolvedLocale),
          variantId: variant?.id,
          variantPrice: variant?.price,
          variantTitle: variant?.title
        };
      }),
    [relatedProducts, resolvedLocale]
  );
  return <ProductRelatedSection products={mappedProducts} />;
}
