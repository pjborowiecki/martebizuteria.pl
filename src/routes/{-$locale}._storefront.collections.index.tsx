import { type JSX, useMemo } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { LocalizedLink } from "~/src/components/custom/localized-link";

import { collectionsQueryOptions } from "~/src/modules/collection/collection.queries";
import type { Collection } from "~/src/modules/collection/collection.types";

export const Route = createFileRoute("/{-$locale}/_storefront/collections/")({
  component: CollectionsPage,
  head: () => ({
    meta: [{ title: `Collections | ${CONSTANTS.APP_NAME}` }, { content: "Discover our curated collections.", name: "description" }]
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(collectionsQueryOptions());
  }
});

function CollectionsPage(): JSX.Element {
  const t = useTranslations("collectionsPage");
  const { data: collections } = useSuspenseQuery(collectionsQueryOptions());

  const [firstCollection] = collections;

  return (
    <main className="container mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mb-8 text-muted-foreground">{t("description")}</p>

        {firstCollection === undefined && <p>{t("noCollectionsFound")}</p>}
        {firstCollection !== undefined && (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function CollectionCard({ collection }: Readonly<{ collection: Pick<Collection["select"], "id" | "title" | "handle"> }>): JSX.Element {
  const params = useMemo(() => ({ handle: collection.handle }), [collection.handle]);

  return (
    <LocalizedLink
      to={CONSTANTS.ROUTES.COLLECTION}
      params={params}
      className="group block rounded-xl border bg-card p-6 text-card-foreground transition-all hover:shadow-md"
    >
      <h2 className="text-2xl font-semibold group-hover:underline">{collection.title}</h2>
      <p className="mt-2 text-muted-foreground">Explore the {collection.title} collection</p>
    </LocalizedLink>
  );
}
