import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { Separator } from "~/src/presentation/components/shadcn/separator"

const STRIPE_PROVIDER = "stripe"

export const PaymentInfoBlock = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderDetail"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orderDetail")
  const billing = order.billingAddress

  return (
    <div>
      <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("paymentInfo")}</h3>
      <Separator className="mt-3 mb-4" />
      <div className="space-y-1 text-[13px] leading-relaxed">
        <p>{order.paymentProvider === STRIPE_PROVIDER ? t("paidByCard") : (order.paymentProvider ?? EMPTY_VALUE)}</p>
        {billing === undefined ? undefined : (
          <>
            <p className="text-muted-foreground">{billing.name}</p>
            <p className="text-muted-foreground">{billing.line1}</p>
            <p className="text-muted-foreground">
              {billing.postalCode} {billing.city}
            </p>
            <p className="text-muted-foreground">{billing.countryCode}</p>
          </>
        )}
        {order.billingCompanyName === undefined ? undefined : <p className="pt-2 text-muted-foreground">{order.billingCompanyName}</p>}
        {order.billingNip === undefined ? undefined : (
          <p className="text-muted-foreground tabular-nums">{t("nip", { nip: order.billingNip })}</p>
        )}
      </div>
    </div>
  )
}
