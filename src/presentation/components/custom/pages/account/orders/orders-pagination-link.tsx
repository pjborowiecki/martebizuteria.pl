import { type JSX, useMemo } from "react"

import { Link } from "@tanstack/react-router"

import { type CustomerAccountOrderFilter } from "~/src/modules/customer-account/customer-account.constants"

import { ROUTES } from "~/src/routes"

export const PaginationLink = ({
  disabled,
  filter,
  label,
  page,
}: Readonly<{
  disabled: boolean
  filter: CustomerAccountOrderFilter
  label: string
  page: number
}>): JSX.Element => {
  const search = useMemo(() => ({ filter, page }), [filter, page])

  if (disabled) {
    return <span className="text-[11px] tracking-[0.15em] text-muted-foreground/40 uppercase">{label}</span>
  }

  return (
    <Link className="text-[11px] tracking-[0.15em] text-foreground uppercase hover:underline" search={search} to={ROUTES.ACCOUNT_ORDERS}>
      {label}
    </Link>
  )
}
