import { type JSX } from "react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

export const AddressLines = ({ address }: Readonly<{ address?: CustomerAccount["orderAddress"] | undefined }>): JSX.Element => {
  if (address === undefined) {
    return <p className="text-[13px] text-muted-foreground">{EMPTY_VALUE}</p>
  }

  return (
    <div className="space-y-1 text-[13px] leading-relaxed">
      <p>{address.name}</p>
      <p className="text-muted-foreground">{address.line1}</p>
      {address.line2 === undefined ? undefined : <p className="text-muted-foreground">{address.line2}</p>}
      <p className="text-muted-foreground">
        {address.postalCode} {address.city}
      </p>
      <p className="text-muted-foreground">{address.countryCode}</p>
      {address.phone === undefined ? undefined : <p className="text-muted-foreground tabular-nums">{address.phone}</p>}
    </div>
  )
}
