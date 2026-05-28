import { type JSX, useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useFormatter, useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { getProductImageUrl, prefetchProductThumbnails } from "~/src/lib/_utils/image";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import { categoryQueryOptions } from "~/src/modules/category/category.queries";
import type { Product } from "~/src/modules/product/product.types";

const CENTS_PER_UNIT = 100;
const FIRST_VARIANT_INDEX = 0;

interface PageMeta {
  readonly description?: string | null;
  readonly title: string;
}

export const Route = createFileRoute("/{-$locale}/_storefront/categories/$handle")({
  component: CategoryPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<PageMeta> }>) => ({
    meta: [
      { title: `${loaderData?.title ?? "Category"} | ${CONSTANTS.APP_NAME}` },
      {
        content: loaderData?.description ?? `Browse products in ${loaderData?.title ?? "this category"}`,
        name: "description"
      }
    ]
  }),
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(categoryQueryOptions.categoryQueryOptions(params.handle));

    if (data === false) {
      notFound({ throw: true });
      return { description: "", title: "" };
    }

    prefetchProductThumbnails(data.products, context.imagePrefetchService);
    return { description: data.description, title: data.name };
  }
});

function CategoryPage(): JSX.Element {
  const t = useTranslations("categoryPage");
  const { handle } = Route.useParams();
  const { data: category } = useSuspenseQuery(categoryQueryOptions.categoryQueryOptions(handle));

  if (category === false) {
    return <div>{t("notFound")}</div>;
  }

  const [firstProduct] = category.products;

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mb-12 max-w-2xl">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">{category.name}</h1>
        {category.description !== null && <p className="text-lg text-muted-foreground">{category.description}</p>}
      </div>

      {firstProduct === undefined && <p>{t("noProductsFound")}</p>}
      {firstProduct !== undefined && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {category.products.map((product) => (
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
  product: Pick<Product["select"], "id" | "title" | "description" | "thumbnail" | "handle"> & {
    readonly variants?: readonly { readonly price: number }[];
  };
}>): JSX.Element {
  const params = useMemo(() => ({ handle: product.handle }), [product.handle]);
  const format = useFormatter();

  const variantPrice = product.variants?.[FIRST_VARIANT_INDEX]?.price;
  const price =
    variantPrice === undefined ? undefined : format.number(variantPrice / CENTS_PER_UNIT, { currency: "PLN", style: "currency" });

  return (
    <LocalizedLink
      to={CONSTANTS.ROUTES.PRODUCT}
      params={params}
      className="group block rounded-lg border p-4 transition-shadow hover:shadow-lg"
    >
      <div className="mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted">
        <ProductImage thumbnail={product.thumbnail} title={product.title} />
      </div>
      <h2 className="font-semibold group-hover:underline">{product.title}</h2>
      {product.description !== null && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>}
      {price !== undefined && <p className="mt-2 text-sm font-medium">{price}</p>}
    </LocalizedLink>
  );
}

function ProductImage({ thumbnail, title }: Readonly<{ thumbnail: string | null; title: string }>): JSX.Element {
  return <Image src={getProductImageUrl(thumbnail)} alt={title} className="h-full w-full object-cover" width={256} height={256} />;
}
