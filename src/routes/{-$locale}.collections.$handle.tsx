import { type JSX, useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { LocalizedLink } from "~/src/components/custom/localized-link";

import { collectionQueryOptions } from "~/src/modules/collection/collection.queries";
import type { Product } from "~/src/modules/product/product.types";

export const Route = createFileRoute("/{-$locale}/collections/$handle")({
  component: CollectionPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<{ title: string }> }>) => ({
    meta: [
      { title: `${loaderData?.title ?? "Collection"} | ${CONSTANTS.APP_NAME}` },
      {
        content: `Browse products in ${loaderData?.title ?? "this collection"}`,
        name: "description"
      }
    ]
  }),
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(collectionQueryOptions(params.handle));
    if (data === false) {
      notFound({ throw: true });
      return { title: "" };
    }
    return { title: data.title };
  }
});

function CollectionPage(): JSX.Element {
  const t = useTranslations("collectionPage");
  const { handle } = Route.useParams();
  const { data: collection } = useSuspenseQuery(collectionQueryOptions(handle));

  if (collection === false) {
    return <div>{t("notFound")}</div>;
  }

  const [firstProduct] = collection.products;

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight">{collection.title}</h1>
      </div>

      {firstProduct === undefined && <p>{t("noProductsFound")}</p>}
      {firstProduct !== undefined && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {collection.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
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

  return <img src={thumbnail} alt={title} className="h-full w-full object-cover" />;
}
