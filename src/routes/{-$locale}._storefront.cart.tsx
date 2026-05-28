import { type JSX, Fragment, useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { isValidLocale } from "~/src/lib/utils";

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

// Matches the sticky navbar height (`h-20`). Subtracting it lets the cart fill
// the first viewport exactly, so the footer only appears on scroll.
const FULL_VIEWPORT_STYLE = { minHeight: "calc(100dvh - 5rem)" } as const;

function CartPage(): JSX.Element {
  const t = useTranslations("cartPage");
  const { items, cartTotal } = useCartStore();

  const itemCount = items.reduce((sum, item) => sum + item.qty, INITIAL_COUNT);
  const tParams = useMemo(() => ({ count: itemCount }), [itemCount]);

  const CENTS_IN_ZLOTY = 100;
  const total = cartTotal() / CENTS_IN_ZLOTY;
  const subtotal = new Intl.NumberFormat("pl-PL", {
    currency: "PLN",
    style: "currency"
  }).format(total);

  if (items.length <= INITIAL_COUNT) {
    return <EmptyCart />;
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
          to={CONSTANTS.ROUTES.PRODUCTS}
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
            to={CONSTANTS.ROUTES.PRODUCTS}
          >
            {t("continueShopping")}
          </LocalizedLink>
        </div>

        <CartSummary subtotal={subtotal} />
      </div>
    </main>
  );
}

function EmptyCart(): JSX.Element {
  const t = useTranslations("cartPage");

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
        to={CONSTANTS.ROUTES.PRODUCTS}
        className="group inline-flex min-h-12 items-center gap-2 border border-foreground/25 px-10 text-xs font-medium tracking-[0.2em] text-foreground uppercase transition-colors hover:border-foreground/60"
      >
        {t("exploreCta")}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.25} />
      </LocalizedLink>
    </main>
  );
}
