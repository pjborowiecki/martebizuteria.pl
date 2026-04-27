import { type JSX, useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { prefetchProductThumbnails } from "~/src/lib/_utils/image";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

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
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ProductCard({
  product
}: Readonly<{
  product: Pick<Product["select"], "id" | "title" | "description" | "thumbnail" | "handle">;
}>): JSX.Element {
  const params = useMemo(() => ({ handle: product.handle }), [product.handle]);

  return (
    <LocalizedLink to="/products/$handle" params={params} className="group block rounded-lg border p-4 transition-shadow hover:shadow-lg">
      <div className="mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted">
        <ProductImage thumbnail={product.thumbnail} title={product.title} />
      </div>
      <h2 className="font-semibold group-hover:underline">{product.title}</h2>
      {product.description !== null && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>}
    </LocalizedLink>
  );
}

function ProductImage({ thumbnail, title }: Readonly<{ thumbnail: string | null; title: string }>): JSX.Element {
  if (thumbnail === null) {
    return <span className="text-muted-foreground/50">No Image</span>;
  }

  return <Image src={thumbnail} alt={title} className="h-full w-full object-cover" height={256} width={256} />;
}
