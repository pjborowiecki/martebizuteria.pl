import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { Heart } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

const WishlistPage = (): JSX.Element => {
  const t = useTranslations("pages.account.wishlist")

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
        <p className="max-w-lg text-[14px] leading-relaxed text-muted-foreground">
          {t("subtitle", {
            count: 0,
          })}
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Heart className="size-8 text-muted-foreground/30" strokeWidth={1} />
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
        <LocalizedLink
          to={ROUTES.PRODUCTS}
          className="mt-2 inline-flex h-10 items-center justify-center bg-foreground px-8 text-[11px] tracking-[0.15em] text-background uppercase transition-colors hover:bg-foreground/90"
        >
          {t("browseProducts")}
        </LocalizedLink>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/account/wishlist")({
  component: WishlistPage,
})
