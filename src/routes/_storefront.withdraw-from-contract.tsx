import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"
import { z } from "zod/v4"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { ORDER_WITHDRAWAL_ORDER_NUMBER_MAX_LENGTH } from "~/src/modules/order-withdrawal/order-withdrawal.constants"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { APP_NAME } from "~/src/presentation/branding/app"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { GuestWithdrawalForm } from "~/src/presentation/components/custom/pages/withdrawal/guest-withdrawal-form"

import type withdrawalMessages from "~/messages/en-US/pages.withdrawal.json"
import { ROUTES } from "~/src/routes"

const WithdrawFromContractPage = (): JSX.Element => {
  const t = useTranslations("pages.withdrawal.page")
  const { order } = Route.useSearch()

  return (
    <main className="container mx-auto max-w-2xl px-4 py-16 md:py-24">
      <header className="space-y-4">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">{t("title")}</h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{t("intro")}</p>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          {t.rich("accountHint", {
            link: (chunks) => (
              <LocalizedLink className="text-foreground underline underline-offset-4" to={ROUTES.ACCOUNT_ORDERS}>
                {chunks}
              </LocalizedLink>
            ),
          })}
        </p>
      </header>

      <GuestWithdrawalForm defaultOrderNumber={order} />
    </main>
  )
}

export const Route = createFileRoute("/_storefront/withdraw-from-contract")({
  component: WithdrawFromContractPage,
  head: pageHead,
  loader: async ({ context }) => {
    const { locale } = context
    const messages = await context.queryClient.query(
      messagesQueryOptions<typeof withdrawalMessages>({ locale, namespace: "pages.withdrawal" }),
    )

    return {
      description: messages.metadata.description,
      title: `${messages.metadata.title} | ${APP_NAME}`,
    } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.withdrawal"],
  },
  validateSearch: z.object({
    order: z.string().trim().max(ORDER_WITHDRAWAL_ORDER_NUMBER_MAX_LENGTH).optional(),
  }),
})
