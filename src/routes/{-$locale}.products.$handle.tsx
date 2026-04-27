import type { JSX } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { prefetchSingleProductImage } from "~/src/lib/_utils/image";

import { Image } from "~/src/components/custom/image";

import { productQueryOptions } from "~/src/modules/product/product.queries";

interface PageMeta {
  readonly description?: string | null;
  readonly title: string;
}

export const Route = createFileRoute("/{-$locale}/products/$handle")({
  component: ProductPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<PageMeta> }>) => ({
    meta: [
      { title: `${loaderData?.title ?? "Product"} | ${CONSTANTS.APP_NAME}` },
      { content: loaderData?.description ?? "", name: "description" }
    ]
  }),
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(productQueryOptions(params.handle));
    if (data === false) {
      notFound({ throw: true });
      return { description: "", title: "" };
    }

    prefetchSingleProductImage(data, context.imagePrefetchService);
    return { description: data.description, title: data.title };
  }
});

function ProductPage(): JSX.Element {
  const t = useTranslations("productPage");
  const { handle } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQueryOptions(handle));

  if (product === false) {
    return <div>{t("notFound")}</div>;
  }

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-muted">
          <ProductImage thumbnail={product.thumbnail} title={product.title} />
        </div>

        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{product.title}</h1>
            {product.subtitle !== null && <h2 className="mt-2 text-xl text-muted-foreground">{product.subtitle}</h2>}
          </div>

          <div className="prose prose-sm md:prose-base dark:prose-invert">
            <p>{product.description}</p>
          </div>

          <button className="w-full rounded-md bg-primary px-8 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto">
            {t("addToCart")}
          </button>
        </div>
      </div>
    </main>
  );
}

function ProductImage({ thumbnail, title }: Readonly<{ thumbnail: string | null; title: string }>): JSX.Element {
  if (thumbnail === null) {
    return <span className="text-muted-foreground">No Image</span>;
  }

  return <Image src={thumbnail} alt={title} className="h-full w-full object-cover" width={512} height={512} />;
}
