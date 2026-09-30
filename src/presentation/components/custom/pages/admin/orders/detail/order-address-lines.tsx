import { type JSX } from "react"

import { type Order } from "~/src/modules/order/order.types"

export const OrderAddressLines = ({ address }: Readonly<OrderAddressLinesProps>): JSX.Element => (
  <div className="space-y-1 text-[13px] text-muted-foreground">
    <p className="font-medium text-foreground">{address.name}</p>
    <p>{address.line1}</p>
    {address.line2 !== undefined && <p>{address.line2}</p>}
    <p>
      {address.postalCode === undefined ? address.city : `${address.postalCode} ${address.city}`}
      {address.province === undefined ? "" : `, ${address.province}`}
    </p>
    <p>{address.countryCode}</p>
    {address.phone !== undefined && <p>{address.phone}</p>}
  </div>
)

interface OrderAddressLinesProps {
  readonly address: Order["adminOrderDetailAddress"]
}
