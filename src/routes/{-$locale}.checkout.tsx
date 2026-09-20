import { type JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"
import { z } from "zod/v4"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { APP_NAME } from "~/src/presentation/branding/app"

import { CheckoutHeader } from "~/src/presentation/components/custom/checkout/components/checkout-header"
const coerceStep = (value: unknown): number => {
  if (typeof value === "number" && Number.isInteger(value) && value >= MIN_STEP && value <= MAX_STEP) {
    return value
  }
  return DEFAULT_STEP
}

/**
 * The router's default (JSON-based) search parser decodes `?success=true` as a boolean, and post-payment
 * redirects (e.g. Przelewy24) land on that URL. Accept the boolean (and a stringified fallback), and drop
 * anything else so a stray param never throws past validateSearch.
 */
const coerceSuccess = (value: unknown): boolean | undefined => (value === true || value === "true" ? true : undefined)

const CheckoutLayout = (): JSX.Element => (
  <div className="min-h-dvh bg-background font-light">
    <main className="mx-auto w-full max-w-400 px-6 py-10 md:py-14 lg:px-12">
      <CheckoutHeader />
      <Outlet />
    </main>
  </div>
)

const DEFAULT_STEP = 1
const MIN_STEP = 1
const MAX_STEP = 4
const checkoutSearchSchema = z.object({
  step: z.preprocess(coerceStep, z.number().int().min(MIN_STEP).max(MAX_STEP).default(DEFAULT_STEP)),
  success: z.preprocess(coerceSuccess, z.boolean().optional()),
})
interface CheckoutPageMeta {
  readonly description: string
  readonly title: string
}
export const Route = createFileRoute("/{-$locale}/checkout")({
  component: CheckoutLayout,
  head: ({
    loaderData,
  }: Readonly<{
    loaderData?: Readonly<CheckoutPageMeta> | undefined
  }>) => ({
    meta: [
      {
        title: loaderData?.title ?? APP_NAME,
      },
      {
        content: loaderData?.description ?? "",
        name: "description",
      },
      {
        content: loaderData?.title ?? APP_NAME,
        property: "og:title",
      },
      {
        content: loaderData?.description ?? "",
        property: "og:description",
      },
    ],
  }),
  loader: async ({ context }) => {
    const { locale } = context
    const messages = await context.queryClient.query(messagesQueryOptions(locale, "pages.checkout"))
    return {
      description: messages.metadata.description,
      title: messages.title === "" ? APP_NAME : `${APP_NAME} | ${messages.title}`,
    } satisfies CheckoutPageMeta
  },
  staticData: {
    namespaces: ["pages.checkout", "pages.cart"],
  },
  validateSearch: checkoutSearchSchema,
})
