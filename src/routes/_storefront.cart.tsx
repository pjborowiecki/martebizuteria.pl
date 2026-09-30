import { Fragment, type JSX, useMemo } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { ArrowRight, ShoppingBag } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { useCartStore } from "~/src/modules/cart/cart.store"

import { useCartAvailability } from "~/src/hooks/use-cart-availability"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { CartItemCard } from "~/src/presentation/components/custom/pages/cart-page/cart-item-card"
import { CartSummary } from "~/src/presentation/components/custom/pages/cart-page/cart-summary"

import type cartMessages from "~/messages/en-US/pages.cart.json"
import { ROUTES } from "~/src/routes"

const CartPage = (): JSX.Element => {
  const t = useTranslations("pages.cart")
  const { items, cartTotal } = useCartStore()
  const { hasUnavailableItems, isChecking } = useCartAvailability()
  const checkoutDisabled = hasUnavailableItems || isChecking
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0)
  const tParams = useMemo(
    () => ({
      count: itemCount,
    }),
    [itemCount],
  )

  const CENTS_IN_ZLOTY = 100
  const total = cartTotal() / CENTS_IN_ZLOTY
  const subtotal = new Intl.NumberFormat("pl-PL", {
    currency: "PLN",
    style: "currency",
  }).format(total)

  if (items.length <= 0) {
    return <EmptyCart />
  }

  return (
    <main className="mx-auto w-full max-w-400 px-6 py-12 lg:px-12 lg:py-20" style={FULL_VIEWPORT_STYLE}>
      <div className="mb-10 flex items-baseline justify-between lg:mb-14">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl tracking-tight md:text-5xl lg:text-6xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("itemCount", tParams)}</p>
        </div>
        <LocalizedLink
          className="hidden text-sm text-foreground/50 underline underline-offset-4 transition-colors hover:text-foreground sm:inline"
          to={ROUTES.PRODUCTS}
        >
          {t("continueShopping")}
        </LocalizedLink>
      </div>

      <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-16 xl:gap-20">
        <div>
          <Separator className="bg-foreground/10" />
          {items.map((item) => (
            <Fragment key={item.id}>
              <CartItemCard item={item} />
              <Separator className="bg-foreground/10" />
            </Fragment>
          ))}

          <LocalizedLink
            className="mt-6 inline-flex text-sm text-foreground/50 underline underline-offset-4 transition-colors hover:text-foreground sm:hidden"
            to={ROUTES.PRODUCTS}
          >
            {t("continueShopping")}
          </LocalizedLink>
        </div>

        <CartSummary checkoutDisabled={checkoutDisabled} subtotal={subtotal} />
      </div>
    </main>
  )
}

const EmptyCart = (): JSX.Element => {
  const t = useTranslations("pages.cart")

  return (
    <main
      className="mx-auto flex w-full max-w-400 flex-col items-center justify-center px-6 py-16 text-center lg:px-12"
      style={FULL_VIEWPORT_STYLE}
    >
      <div className="mb-8 flex size-20 items-center justify-center rounded-full border border-border/60 bg-muted/20">
        <ShoppingBag className="size-7 text-muted-foreground/60" strokeWidth={1.25} />
      </div>

      <h1 className="mb-9 font-serif text-3xl tracking-tight text-foreground md:text-4xl">{t("emptyTitle")}</h1>

      <LocalizedLink
        to={ROUTES.PRODUCTS}
        className="group inline-flex min-h-12 items-center gap-2 border border-foreground/25 px-10 text-xs font-medium tracking-[0.2em] text-foreground uppercase transition-colors hover:border-foreground/60"
      >
        {t("exploreCta")}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.25} />
      </LocalizedLink>
    </main>
  )
}

export const Route = createFileRoute("/_storefront/cart")({
  component: CartPage,
  head: pageHead,
  loader: async ({ context }) => {
    const { locale } = context
    const messages = await context.queryClient.query(messagesQueryOptions<typeof cartMessages>({ locale, namespace: "pages.cart" }))

    return {
      description: messages.description,
      title: messages.title,
    } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.cart"],
  },
})

const FULL_VIEWPORT_STYLE = {
  minHeight: "calc(100dvh - 5rem)",
} as const
