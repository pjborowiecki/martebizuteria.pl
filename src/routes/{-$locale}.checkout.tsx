import { type JSX, Suspense, useMemo } from "react";

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useTranslations } from "use-intl";
import { z } from "zod/v4";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { type Messages, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

import { isValidLocale } from "~/src/lib/utils";

import { Skeleton } from "~/src/components/shadcn/skeleton";

import { CheckoutHeader } from "~/src/components/custom/checkout/components/checkout-header";
import { CheckoutSummary } from "~/src/components/custom/checkout/components/checkout-summary";

const DEFAULT_STEP = 1;
const MIN_STEP = 1;
const MAX_STEP = 4;

function coerceStep(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= MIN_STEP && value <= MAX_STEP) {
    return value;
  }
  return DEFAULT_STEP;
}

const checkoutSearchSchema = z.object({
  step: z.preprocess(coerceStep, z.number().int().min(MIN_STEP).max(MAX_STEP).default(DEFAULT_STEP))
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
      description: messages?.checkoutPage?.metadata?.description ?? "",
      title:
        messages?.checkoutPage?.title !== undefined && messages.checkoutPage.title !== ""
          ? `${CONSTANTS.APP_NAME} | ${messages.checkoutPage.title}`
          : CONSTANTS.APP_NAME
    } satisfies CheckoutPageMeta;
  },
  validateSearch: checkoutSearchSchema
});

function SummarySkeleton(): JSX.Element {
  return (
    <div className="space-y-4 border border-border bg-card p-6 md:p-8">
      <Skeleton className="h-8 w-1/2 rounded-none" />
      <Skeleton className="h-4 w-full rounded-none" />
      <Skeleton className="h-4 w-full rounded-none" />
      <Skeleton className="h-4 w-2/3 rounded-none" />
    </div>
  );
}

function CheckoutLayout(): JSX.Element {
  const t = useTranslations("checkoutPage");
  const summarySkeleton = useMemo(() => <SummarySkeleton />, []);

  return (
    <div className="min-h-dvh bg-background font-light">
      <main className="mx-auto w-full max-w-400 px-6 py-10 md:py-14 lg:px-12">
        <CheckoutHeader />
        <h1 className="mb-6 font-serif text-4xl tracking-tight text-foreground md:mb-8 md:text-5xl lg:text-6xl">{t("title")}</h1>
        <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-8">
            <Outlet />
          </div>
          <div className="lg:col-span-4">
            <Suspense fallback={summarySkeleton}>
              <CheckoutSummary />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
