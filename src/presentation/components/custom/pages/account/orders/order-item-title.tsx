import { type JSX } from "react"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const ItemTitle = ({
  handle,
  name,
}: Readonly<{
  handle?: string | undefined
  name: string
}>): JSX.Element => {
  if (handle === undefined) {
    return <p className="text-[14px] tracking-[0.01em]">{name}</p>
  }

  return (
    <LocalizedLink className="text-[14px] tracking-[0.01em] hover:underline" params={{ handle }} to={ROUTES.PRODUCT}>
      {name}
    </LocalizedLink>
  )
}
