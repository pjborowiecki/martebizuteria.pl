import { type JSX } from "react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { type User } from "~/src/modules/user/user.types"

const EmptyDash = (): JSX.Element => <span className="text-sm text-muted-foreground/50">{EMPTY_VALUE}</span>

export const CustomerStripeCustomerIdCell = ({
  stripeCustomerId,
}: Readonly<{
  stripeCustomerId: User["adminCustomerListItem"]["stripeCustomerId"]
}>): JSX.Element => {
  if (stripeCustomerId === null || stripeCustomerId === "") {
    return <EmptyDash />
  }

  return <span className="block font-mono text-xs whitespace-nowrap text-muted-foreground">{stripeCustomerId}</span>
}

export const CustomerPhoneCell = ({
  phone,
}: Readonly<{
  phone: User["adminCustomerListItem"]["phone"]
}>): JSX.Element => {
  if (phone === null || phone === "") {
    return <EmptyDash />
  }

  return <span className="font-mono text-sm tabular-nums">{phone}</span>
}
