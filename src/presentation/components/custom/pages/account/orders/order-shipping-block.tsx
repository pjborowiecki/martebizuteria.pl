import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { AddressLines } from "~/src/presentation/components/custom/pages/account/orders/order-address-lines"

export const ShippingBlock = ({
  order,
}: Readonly<{
  order: CustomerAccount["orderDetail"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orderDetail")
  const address = order.shippingAddress

  return (
    <div>
      <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
        {order.lockerId === undefined ? t("shippingAddress") : t("pickupPoint")}
      </h3>
      <Separator className="mt-3 mb-4" />
      {order.lockerId === undefined ? undefined : (
        <p className="mb-3 text-[13px]">
          {order.lockerId}
          {order.deliveryMethodName === undefined ? undefined : (
            <span className="text-muted-foreground"> · {order.deliveryMethodName}</span>
          )}
        </p>
      )}
      <AddressLines address={address} />
    </div>
  )
}
