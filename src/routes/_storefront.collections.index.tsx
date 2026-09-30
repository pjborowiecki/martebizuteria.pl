import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { getCollectionsQuery } from "~/src/modules/product-collection/use-cases/get-collections"

import { APP_NAME } from "~/src/presentation/branding/app"

import { CollectionCard } from "~/src/presentation/components/custom/pages/collections/collection-card"

import type collectionsMessages from "~/messages/en-US/pages.collections.json"

const CollectionsPage = (): JSX.Element => {
  const t = useTranslations("pages.collections")
  const { data: collections } = useSuspenseQuery(getCollectionsQuery())
  const [firstCollection] = collections

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
  )
}

export const Route = createFileRoute("/_storefront/collections/")({
  component: CollectionsPage,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?:
      | {
          readonly description: string
          readonly title: string
        }
      | undefined
  }>) => ({
    meta: [
      {
        title: loaderData === undefined ? APP_NAME : `${loaderData.title} | ${APP_NAME}`,
      },
      {
        content: loaderData?.description ?? "",
        name: "description",
      },
    ],
  }),
  loader: async ({ context }) => {
    const [messages] = await Promise.all([
      context.queryClient.query(
        messagesQueryOptions<typeof collectionsMessages>({ locale: context.locale, namespace: "pages.collections" }),
      ),
      context.queryClient.query({
        ...getCollectionsQuery(),
        staleTime: "static",
      }),
    ])

    return {
      description: messages.description,
      title: messages.title,
    }
  },
  staticData: {
    namespaces: ["pages.collections"],
  },
})
