import { type JSX } from "react"

import { APP_NAME } from "~/src/presentation/branding/app"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

export const CheckoutHeader = (): JSX.Element => (
  <header className="pb-10 md:pb-12">
    <LocalizedLink to="/" className="font-serif text-2xl leading-none tracking-tight text-foreground uppercase md:text-3xl">
      {APP_NAME}
    </LocalizedLink>
  </header>
)
