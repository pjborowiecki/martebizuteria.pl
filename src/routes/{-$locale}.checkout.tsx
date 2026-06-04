import { type JSX } from "react";

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { z } from "zod/v4";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { isValidLocale } from "~/src/lib/utils";

import { CheckoutHeader } from "~/src/components/custom/checkout/components/checkout-header";

const DEFAULT_STEP = 1;
const MIN_STEP = 1;
const MAX_STEP = 4;

function coerceStep(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= MIN_STEP && value <= MAX_STEP) {
    return value;
  }
  return DEFAULT_STEP;
}

// The router's default (JSON-based) search parser decodes `?success=true` as a
// boolean, and post-payment redirects (e.g. Przelewy24) land on that URL. Accept
// the boolean (and a stringified fallback), and drop anything else so a stray
// param never throws past validateSearch.
function coerceSuccess(value: unknown): boolean | undefined {
  return value === true || value === "true" ? true : undefined;
}

const checkoutSearchSchema = z.object({
  step: z.preprocess(coerceStep, z.number().int().min(MIN_STEP).max(MAX_STEP).default(DEFAULT_STEP)),
  success: z.preprocess(coerceSuccess, z.boolean().optional())
});

interface CheckoutPageMeta {
  readonly description: string;
  readonly title: string;
}

export const Route = createFileRoute("/{-$locale}/checkout")({
  component: CheckoutLayout,
  head: ({ loaderData }: Readonly<{ loaderData?: Readonly<CheckoutPageMeta> }>) => ({
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
      description: messages?.pages.checkout?.metadata?.description ?? "",
      title:
        messages?.pages.checkout?.title !== undefined && messages.pages.checkout.title !== ""
          ? `${CONSTANTS.APP_NAME} | ${messages.pages.checkout.title}`
          : CONSTANTS.APP_NAME
    } satisfies CheckoutPageMeta;
  },
  validateSearch: checkoutSearchSchema
});

function CheckoutLayout(): JSX.Element {
  return (
    <div className="min-h-dvh bg-background font-light">
      <main className="mx-auto w-full max-w-400 px-6 py-10 md:py-14 lg:px-12">
        <CheckoutHeader />
        <Outlet />
      </main>
    </div>
  );
}
