import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { formatInpostLockerAddress } from "~/src/integrations/inpost/inpost.utils"

import { type Order } from "~/src/modules/order/order.types"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { AddressLines } from "~/src/presentation/components/custom/pages/account/orders/order-address-lines"

const HEADING_CLASS = "text-[11px] tracking-[0.2em] text-muted-foreground uppercase"

const LockerRecipient = ({ address }: Readonly<{ address: Order["customerOrderAddress"] | undefined }>): JSX.Element | undefined => {
  const t = useTranslations("pages.account.orderDetail")

  if (address === undefined) {
    return undefined
  }

  return (
    <div className="mt-5 space-y-1 text-[13px] leading-relaxed">
      <p className={HEADING_CLASS}>{t("recipient")}</p>
      <p className="text-muted-foreground">{t("recipientHint")}</p>
      <p>{address.name}</p>
      {address.phone === undefined ? undefined : <p className="text-muted-foreground tabular-nums">{address.phone}</p>}
    </div>
  )
}

export const ShippingBlock = ({
  order,
}: Readonly<{
  order: Order["customerOrderDetail"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.orderDetail")

  if (order.lockerId === undefined) {
    return (
      <div>
        <h3 className={HEADING_CLASS}>{t("shippingAddress")}</h3>
        <Separator className="mt-3 mb-4" />
        <AddressLines address={order.shippingAddress} />
      </div>
    )
  }

  return (
    <div>
      <h3 className={HEADING_CLASS}>{t("pickupPoint")}</h3>
      <Separator className="mt-3 mb-4" />
      <div className="space-y-1 text-[13px] leading-relaxed">
        <p>
          {order.lockerId}
          {order.deliveryMethodName === undefined ? undefined : (
            <span className="text-muted-foreground"> · {order.deliveryMethodName}</span>
          )}
        </p>
        {order.lockerPoint?.description === undefined ? undefined : (
          <p className="text-muted-foreground">{order.lockerPoint.description}</p>
        )}
        {(order.lockerPoint === undefined ? [] : formatInpostLockerAddress(order.lockerPoint)).map((line) => (
          <p className="text-muted-foreground" key={line}>
            {line}
          </p>
        ))}
      </div>
      <LockerRecipient address={order.shippingAddress} />
    </div>
  )
}
