import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { ADMIN_CARD_CONTENT_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/_styles/order-detail.styles"
import { OrderAddressLines } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-address-lines"

export const OrderBillingCard = ({
  billingAddress,
  billingCompanyName,
  billingNip,
  sameAsShipping,
}: Readonly<OrderBillingCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <Card className={ORDER_DETAIL_CARD_CLASS}>
      <CardContent className={ADMIN_CARD_CONTENT_CLASS}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">{t("orderDetail.billing.title")}</p>
          {sameAsShipping && (
            <Badge className="text-[10px]" variant="outline">
              {t("orderDetail.billing.sameAsShipping")}
            </Badge>
          )}
        </div>
        {billingAddress === undefined ? (
          <p className="text-[13px] text-muted-foreground">{t("orderDetail.billing.missing")}</p>
        ) : (
          <OrderAddressLines address={billingAddress} />
        )}
        {billingCompanyName === undefined && billingNip === undefined ? undefined : (
          <div className="mt-4 space-y-1 border-t border-border/40 pt-4 text-[13px] text-muted-foreground">
            <p className="text-[11px] font-medium tracking-wide text-foreground uppercase">{t("orderDetail.billing.companyInvoice")}</p>
            {billingCompanyName !== undefined && <p className="font-medium text-foreground">{billingCompanyName}</p>}
            {billingNip !== undefined && <p className="tabular-nums">{t("orderDetail.billing.nip", { nip: billingNip })}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface OrderBillingCardProps {
  readonly billingAddress: Order["adminOrderDetailAddress"] | undefined
  readonly billingCompanyName: string | undefined
  readonly billingNip: string | undefined
  readonly sameAsShipping: boolean
}
