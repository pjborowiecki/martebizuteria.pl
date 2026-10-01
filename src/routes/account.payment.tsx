import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { accountPageMeta } from "~/src/modules/customer-account/customer-account.meta"
import { listSavedPaymentMethodsQuery } from "~/src/modules/payment/use-cases/list-saved-payment-methods"

import { pageHead } from "~/src/lib/seo"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { SavedCardList } from "~/src/presentation/components/custom/pages/account/payment/saved-card-list"

const PaymentPage = (): JSX.Element => {
  const t = useTranslations("pages.account.payment")
  const { data: methods } = useSuspenseQuery(listSavedPaymentMethodsQuery())

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
        <p className="max-w-lg text-[14px] leading-relaxed text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          {t("saved")} ({methods.length})
        </h2>
      </div>
      <Separator className="mt-3 mb-0" />

      <SavedCardList methods={methods} />

      <Separator className="my-10" />

      <div className="space-y-2">
        <p className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase">{t("securityNote")}</p>
        <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground/70">{t("securityDesc")}</p>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/account/payment")({
  component: PaymentPage,
  head: pageHead,
  loader: async ({ context }) => {
    await context.queryClient.query({ ...listSavedPaymentMethodsQuery(), staleTime: "static" })

    return accountPageMeta(context.queryClient, context.locale, "payment")
  },
})
