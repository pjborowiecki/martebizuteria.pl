import { type JSX, useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useFormatter, useLocale, useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { getProductImageUrl, prefetchProductThumbnails } from "~/src/lib/_utils/image";
import { centsToDisplayAmount } from "~/src/lib/utils";

import { ProductCard } from "~/src/components/custom/product-card";

import { DEFAULT_VARIANT_TITLE } from "~/src/modules/product-variant/product-variant.utils";
import { productQueryOptions } from "~/src/modules/product/product.queries";
import type { Product } from "~/src/modules/product/product.types";
import { resolveProductDescription, resolveProductTitle } from "~/src/modules/product/product.utils";

const FIRST_VARIANT_INDEX = 0;

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
  const t = useTranslations("pages.products");
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
}: Readonly<{
  product: Pick<Product["select"], "descriptions" | "handle" | "thumbnail" | "titles"> & {
    readonly variants?: readonly { readonly id: string; readonly price: number; readonly title: string }[];
  };
}>): JSX.Element {
  const locale = useLocale();
  const params = useMemo(() => ({ handle: product.handle }), [product.handle]);
  const format = useFormatter();

  const variant = product.variants?.[FIRST_VARIANT_INDEX];
  const variantPrice = variant?.price;
  const price =
    variantPrice === undefined ? undefined : format.number(centsToDisplayAmount(variantPrice), { currency: "PLN", style: "currency" });
  const variantTitle = variant?.title === DEFAULT_VARIANT_TITLE ? "" : (variant?.title ?? "");
  const title = resolveProductTitle(product.titles, locale);
  const description = resolveProductDescription(product.descriptions, locale);

  return (
    <ProductCard
      href="/products/$handle"
      params={params}
      image={getProductImageUrl(product.thumbnail)}
      name={title}
      detail={description}
      price={price}
      rawPrice={variantPrice}
      slug={product.handle}
      variantId={variant?.id}
      variantTitle={variantTitle}
    />
  );
}
