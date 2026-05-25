import { type JSX, Fragment, useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, RotateCcw, ShoppingBag, Truck } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { cn, isValidLocale } from "~/src/lib/utils";

import { Separator } from "~/src/components/shadcn/separator";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import { CartItemCard } from "~/src/components/custom/pages/cart-page/cart-item-card";
import { CartSummary } from "~/src/components/custom/pages/cart-page/cart-summary";

import { useCartStore } from "~/src/stores/cart.store";

interface CartPageMeta {
  readonly description: string;
  readonly title: string;
}

export const Route = createFileRoute("/{-$locale}/_storefront/cart")({
  component: CartPage,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<CartPageMeta> }>) => ({
    meta: [
      { title: loaderData?.title ?? CONSTANTS.APP_NAME },
      { content: loaderData?.description ?? "", name: "description" },
      { content: loaderData?.title ?? CONSTANTS.APP_NAME, property: "og:title" },
      { content: loaderData?.description ?? "", property: "og:description" }
    ]
  }),
  loader: ({ context, params }) => {
    const { locale: rawLocale } = params;
    let locale: Locale = CONSTANTS.DEFAULT_LOCALE;

    if (typeof rawLocale === "string" && isValidLocale(rawLocale)) {
      locale = rawLocale;
    }

    const messages = context.queryClient.getQueryData<Messages>(messagesQueryOptions(locale).queryKey);

    return {
      description: messages?.cartPage.description ?? "",
      title: messages?.cartPage.title ?? CONSTANTS.APP_NAME
    } satisfies CartPageMeta;
  }
});

const INITIAL_COUNT = 0;

function CartPage(): JSX.Element {
  const t = useTranslations("cartPage");
  const { items } = useCartStore();

  const itemCount = items.reduce((sum, item) => sum + item.qty, INITIAL_COUNT);

  const subtotal = "1,040 PLN";

  const tParams = useMemo(() => ({ count: itemCount }), [itemCount]);

  return (
    <main className={cn("mx-auto w-full max-w-400 px-6 py-12 lg:px-12 lg:py-20", items.length <= INITIAL_COUNT && "flex flex-1 flex-col")}>
      <div className="mb-10 flex items-baseline justify-between lg:mb-14">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl tracking-tight md:text-5xl lg:text-6xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("itemCount", tParams)}</p>
        </div>
        <LocalizedLink
          className="hidden text-sm text-foreground/50 underline underline-offset-4 transition-colors hover:text-foreground sm:inline"
          to={CONSTANTS.ROUTES.PRODUCTS}
        >
          {t("continueShopping")}
        </LocalizedLink>
      </div>

      {items.length > INITIAL_COUNT ? (
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
              to={CONSTANTS.ROUTES.PRODUCTS}
            >
              {t("continueShopping")}
            </LocalizedLink>
          </div>

          <CartSummary subtotal={subtotal} />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          {/* Decorative icon */}
          <div className="mb-10 flex size-24 items-center justify-center border border-border/30 bg-muted/20">
            <ShoppingBag className="size-8 text-muted-foreground/40" strokeWidth={1} />
          </div>

          {/* Heading */}
          <h2 className="mb-4 font-serif text-3xl tracking-tight text-foreground md:text-4xl">{t("emptyTitle")}</h2>

          {/* Subtitle */}
          <p className="mx-auto mb-10 max-w-md text-sm leading-relaxed text-muted-foreground">{t("emptySubtitle")}</p>

          {/* CTA */}
          <LocalizedLink
            to={CONSTANTS.ROUTES.PRODUCTS}
            className="group inline-flex min-h-12 items-center gap-2 bg-foreground px-10 text-xs font-medium tracking-[0.2em] text-background uppercase transition-opacity hover:opacity-90"
          >
            {t("exploreCta")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.25} />
          </LocalizedLink>

          {/* Trust badges */}
          <div className="mt-14 flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            <div className="flex items-center gap-2.5 text-xs tracking-[0.15em] text-muted-foreground/60 uppercase">
              <Truck className="size-4" strokeWidth={1.25} />
              <span>{t("trust.freeShipping")}</span>
            </div>
            <Separator orientation="vertical" className="hidden h-4 sm:block" />
            <div className="flex items-center gap-2.5 text-xs tracking-[0.15em] text-muted-foreground/60 uppercase">
              <RotateCcw className="size-4" strokeWidth={1.25} />
              <span>{t("trust.freeReturns")}</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
