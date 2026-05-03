import { type JSX, Fragment, useMemo } from "react";

import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/{-$locale}/cart")({
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
    <main className="mx-auto max-w-400 px-6 py-12 lg:px-12 lg:py-20">
      <div className="mb-10 flex items-baseline justify-between lg:mb-14">
        <div className="space-y-2">
          <h1 className="font-serif text-4xl tracking-tight md:text-5xl lg:text-6xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("itemCount", tParams)}</p>
        </div>
        <LocalizedLink
          className="hidden text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground sm:inline"
          to="/products"
        >
          {t("continueShopping")}
        </LocalizedLink>
      </div>

      {items.length > INITIAL_COUNT ? (
        <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-16 xl:gap-20">
          <div>
            <Separator className="bg-border" />
            {items.map((item) => (
              <Fragment key={item.id}>
                <CartItemCard item={item} />
                <Separator className="bg-border" />
              </Fragment>
            ))}

            <LocalizedLink
              className="mt-6 inline-flex text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground sm:hidden"
              to="/products"
            >
              {t("continueShopping")}
            </LocalizedLink>
          </div>

          <CartSummary subtotal={subtotal} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-6 py-20 text-center">
          <p className="max-w-prose text-muted-foreground">{t("description")}</p>
          <LocalizedLink className="text-primary underline-offset-4 hover:underline" to="/">
            {t("goHome")}
          </LocalizedLink>
        </div>
      )}
    </main>
  );
}
