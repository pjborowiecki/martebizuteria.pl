import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { type Order } from "~/src/modules/order/order.types"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { OrderAddressLines } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-address-lines"
import { ORDER_DETAIL_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-detail.styles"

export const OrderBillingCard = ({ billingAddress, sameAsShipping }: Readonly<OrderBillingCardProps>): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <Card className={ORDER_DETAIL_CARD_CLASS}>
      <CardContent className="p-5">
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
      </CardContent>
    </Card>
  )
}

interface OrderBillingCardProps {
  readonly billingAddress: Order["adminOrderDetailAddress"] | undefined
  readonly sameAsShipping: boolean
}
