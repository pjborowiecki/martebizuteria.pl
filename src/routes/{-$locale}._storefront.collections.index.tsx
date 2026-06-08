import { type JSX } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { CollectionCard } from "~/src/components/custom/pages/collections/collection-card";

import { collectionQueryOptions } from "~/src/modules/product-collection/product-collection.queries";

export const Route = createFileRoute("/{-$locale}/_storefront/collections/")({
  component: CollectionsPage,
  head: () => ({
    meta: [{ title: `Collections | ${CONSTANTS.APP_NAME}` }, { content: "Discover our curated collections.", name: "description" }]
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(collectionQueryOptions.collectionsQueryOptions());
  }
});

function CollectionsPage(): JSX.Element {
  const t = useTranslations("pages.collections");
  const { data: collections } = useSuspenseQuery(collectionQueryOptions.collectionsQueryOptions());

  const [firstCollection] = collections;

  return (
    <main className="mx-auto max-w-400 px-6 pt-8 pb-24 lg:px-12 lg:pt-10 lg:pb-32">
      <header className="mb-8 space-y-3 lg:mb-10">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl lg:text-6xl">{t("title")}</h1>
        <p className="max-w-xl text-sm/relaxed text-muted-foreground">{t("description")}</p>
      </header>

      {firstCollection === undefined && <p className="text-sm text-muted-foreground">{t("noCollectionsFound")}</p>}
      {firstCollection !== undefined && (
        <div className="grid gap-6 md:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </main>
  );
}
