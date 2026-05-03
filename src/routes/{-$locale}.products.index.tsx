import { type JSX, useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { prefetchProductThumbnails } from "~/src/lib/_utils/image";

import { ProductCard } from "~/src/components/custom/product-card";

import { productsQueryOptions } from "~/src/modules/product/product.queries";
import type { Product } from "~/src/modules/product/product.types";

export const Route = createFileRoute("/{-$locale}/products/")({
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: `Products | ${CONSTANTS.APP_NAME}` },
      { content: "Browse our complete collection of exquisite jewelry.", name: "description" }
    ]
  }),
  loader: async ({ context }) => {
    const products = await context.queryClient.ensureQueryData(productsQueryOptions());
    prefetchProductThumbnails(products, context.imagePrefetchService);
  }
});

function ProductsPage(): JSX.Element {
  const t = useTranslations("productsPage");
  const { data: products } = useSuspenseQuery(productsQueryOptions());

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

function ProductListItem({ product }: Readonly<{ product: Product["select"] }>): JSX.Element {
  const params = useMemo(() => ({ handle: product.handle }), [product.handle]);

  return (
    <ProductCard
      href="/products/$handle"
      params={params}
      image={product.thumbnail ?? ""}
      name={product.title}
      detail={product.description ?? ""}
    />
  );
}
