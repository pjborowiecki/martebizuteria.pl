import { type JSX } from "react"

import { CheckCircle2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"

import { useFormatter } from "~/src/hooks/use-display-format"

import { BUSINESS } from "~/src/presentation/branding/business"

export const useDescribeWithdrawalReceipt = (): ((receipt: OrderWithdrawal["receipt"]) => string) => {
  const t = useTranslations("pages.withdrawal.result")
  const format = useFormatter()

  return ({ acknowledged, email, submittedAt }) =>
    t(acknowledged ? "acknowledged" : "notAcknowledged", {
      date: format.dateTime(submittedAt, { dateStyle: "long", timeStyle: "short" }),
      email,
      shopEmail: BUSINESS.EMAIL,
    })
}

export const WithdrawalSubmitted = (): JSX.Element => {
  const t = useTranslations("pages.withdrawal.result")

  return (
    <div className="mt-12 flex flex-col items-start gap-4 border border-border/60 p-6 md:p-8" role="status">
      <CheckCircle2 aria-hidden className="size-8 text-success" strokeWidth={1} />
      <h2 className="font-serif text-2xl leading-tight">{t("submitted")}</h2>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
        {t("submittedDescription", { shopEmail: BUSINESS.EMAIL })}
      </p>
    </div>
  )
}
