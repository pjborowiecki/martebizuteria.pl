import { type JSX, useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useFormatter, useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { getProductImageUrl, prefetchProductThumbnails } from "~/src/lib/_utils/image";

import { ProductCard } from "~/src/components/custom/product-card";

import { productQueryOptions } from "~/src/modules/product/product.queries";
import type { Product } from "~/src/modules/product/product.types";

const CENTS_PER_UNIT = 100;
const FIRST_VARIANT_INDEX = 0;

const FALLBACK_PRICE = 0;

export const Route = createFileRoute("/{-$locale}/_storefront/products/")({
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: `Products | ${CONSTANTS.APP_NAME}` },
      { content: "Browse our complete collection of exquisite jewelry.", name: "description" }
    ]
  }),
  loader: async ({ context }) => {
    const products = await context.queryClient.ensureQueryData(productQueryOptions.productsQueryOptions());
    prefetchProductThumbnails(products, context.imagePrefetchService);
  }
});

function ProductsPage(): JSX.Element {
  const t = useTranslations("productsPage");
  const { data: products } = useSuspenseQuery(productQueryOptions.productsQueryOptions());

  const [firstProduct] = products;

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mb-8 text-muted-foreground">{t("description")}</p>

        {firstProduct === undefined && <p>{t("noProductsFound")}</p>}
        {firstProduct !== undefined && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductListItem key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ProductListItem({
  product
}: Readonly<{ product: Product["select"] & { readonly variants?: readonly { readonly price: number }[] } }>): JSX.Element {
  const params = useMemo(() => ({ handle: product.handle }), [product.handle]);
  const format = useFormatter();

  const variantPrice = product.variants?.[FIRST_VARIANT_INDEX]?.price;
  const price =
    variantPrice === undefined ? undefined : format.number(variantPrice / CENTS_PER_UNIT, { currency: "PLN", style: "currency" });

  return (
    <ProductCard
      href="/products/$handle"
      params={params}
      image={getProductImageUrl(product.thumbnail)}
      name={product.title}
      detail={product.description ?? ""}
      price={price}
      rawPrice={variantPrice ?? FALLBACK_PRICE}
    />
  );
}
