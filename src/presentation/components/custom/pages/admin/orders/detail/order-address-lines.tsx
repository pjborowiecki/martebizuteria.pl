import { type JSX } from "react"

import { useLocale } from "use-intl/react"

import { formatOrderAddressLocality } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"

export const OrderAddressLines = ({ address }: Readonly<OrderAddressLinesProps>): JSX.Element => {
  const locale = useLocale()

  return (
    <div className="space-y-1 text-[13px] text-muted-foreground">
      <p className="font-medium text-foreground">{address.name}</p>
      <p>{address.line1}</p>
      {address.line2 !== undefined && <p>{address.line2}</p>}
      <p>{formatOrderAddressLocality(address, locale)}</p>
      {address.phone !== undefined && <p>{address.phone}</p>}
    </div>
  )
}

interface OrderAddressLinesProps {
  readonly address: Order["adminOrderDetailAddress"]
}
