import { type JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"
import { z } from "zod/v4"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { APP_NAME } from "~/src/presentation/branding/app"

import { CheckoutHeader } from "~/src/presentation/components/custom/checkout/components/checkout-header"

import type checkoutMessages from "~/messages/en-US/pages.checkout.json"

const coerceStep = (value: unknown): number => {
  if (typeof value === "number" && Number.isInteger(value) && value >= MIN_STEP && value <= MAX_STEP) {
    return value
  }

  return DEFAULT_STEP
}

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

const STRIPE_SESSION_ID_MAX_LENGTH = 255

const checkoutSearchSchema = z.object({
  session_id: z.string().trim().max(STRIPE_SESSION_ID_MAX_LENGTH).optional(),
  step: z.preprocess(coerceStep, z.number().int().min(MIN_STEP).max(MAX_STEP).default(DEFAULT_STEP)),
  success: z.preprocess(coerceSuccess, z.boolean().optional()),
})

export const Route = createFileRoute("/checkout")({
  component: CheckoutLayout,
  head: pageHead,
  loader: async ({ context }) => {
    const { locale } = context
    const messages = await context.queryClient.query(messagesQueryOptions<typeof checkoutMessages>({ locale, namespace: "pages.checkout" }))

    return {
      description: messages.metadata.description,
      title: `${APP_NAME} | ${messages.title}`,
    } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.checkout", "pages.cart"],
  },
  validateSearch: checkoutSearchSchema,
})
