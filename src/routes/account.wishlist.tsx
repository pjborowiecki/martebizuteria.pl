import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useLocale, useTranslations } from "use-intl/react"

import { accountPageMeta } from "~/src/modules/customer-account/customer-account.meta"
import { listWishlistItemsQuery } from "~/src/modules/wishlist/use-cases/list-wishlist-items"

import { pageHead } from "~/src/lib/seo"

import { WishlistGrid } from "~/src/presentation/components/custom/pages/account/wishlist/wishlist-grid"

const WishlistPage = (): JSX.Element => {
  const t = useTranslations("pages.account.wishlist")
  const locale = useLocale()
  const { data: items } = useSuspenseQuery(listWishlistItemsQuery(locale))

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
        <p className="max-w-lg text-[14px] leading-relaxed text-muted-foreground">{t("subtitle", { count: items.length })}</p>
      </div>

      <WishlistGrid items={items} />
    </div>
  )
}

export const Route = createFileRoute("/account/wishlist")({
  component: WishlistPage,
  head: pageHead,
  loader: async ({ context }) => {
    await context.queryClient.query({ ...listWishlistItemsQuery(context.locale), staleTime: "static" })

    return accountPageMeta(context.queryClient, context.locale, "wishlist")
  },
})
