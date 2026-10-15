import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { formatInpostLockerAddress } from "~/src/integrations/inpost/inpost.utils"

import { type Order } from "~/src/modules/order/order.types"

export const OrderLockerDestination = ({ code, point }: Readonly<Order["locker"]>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail.shipping")

  return (
    <div className="space-y-1 text-[13px] text-muted-foreground">
      <p className="font-mono text-sm font-medium text-foreground">{code}</p>
      {point === undefined ? (
        <p>{t("lockerAddressMissing")}</p>
      ) : (
        <>
          {point.description !== undefined && <p>{point.description}</p>}
          {formatInpostLockerAddress(point).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </>
      )}
    </div>
  )
}

export const OrderLockerRecipient = ({ address }: Readonly<{ address: Order["adminOrderDetailAddress"] | undefined }>): JSX.Element => {
  const t = useTranslations("pages.admin.orderDetail.shipping")

  return (
    <div className="space-y-1 text-[13px] text-muted-foreground">
      <p className="text-[11px] font-medium tracking-wide text-foreground uppercase">{t("recipientTitle")}</p>
      <p>{t("recipientHint")}</p>
      {address === undefined ? (
        <p>{t("recipientMissing")}</p>
      ) : (
        <>
          <p className="font-medium text-foreground">{address.name}</p>
          {address.phone !== undefined && <p className="tabular-nums">{address.phone}</p>}
        </>
      )}
    </div>
  )
}
