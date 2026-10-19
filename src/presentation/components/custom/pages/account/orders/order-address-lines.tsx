import { type JSX } from "react"

import { useLocale } from "use-intl/react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { formatOrderAddressLocality } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"

export const AddressLines = ({ address }: Readonly<{ address?: Order["customerOrderAddress"] | undefined }>): JSX.Element => {
  const locale = useLocale()

  if (address === undefined) {
    return <p className="text-[13px] text-muted-foreground">{EMPTY_VALUE}</p>
  }

  return (
    <div className="space-y-1 text-[13px] leading-relaxed">
      <p>{address.name}</p>
      <p className="text-muted-foreground">{address.line1}</p>
      {address.line2 === undefined ? undefined : <p className="text-muted-foreground">{address.line2}</p>}
      <p className="text-muted-foreground">
        {formatOrderAddressLocality(
          { city: address.city, countryCode: address.countryCode, postalCode: address.postalCode, province: address.province },
          locale,
        )}
      </p>
      {address.phone === undefined ? undefined : <p className="text-muted-foreground tabular-nums">{address.phone}</p>}
    </div>
  )
}
