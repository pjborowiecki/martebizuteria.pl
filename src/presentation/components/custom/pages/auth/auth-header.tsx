import { type JSX } from "react"

import { APP_NAME } from "~/src/presentation/branding/app"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const AuthHeader = ({
  title,
  subtitle,
}: Readonly<{
  title: string
  subtitle: string
}>): JSX.Element => (
  <div className="space-y-6">
    <LocalizedLink to={ROUTES.HOME} className="font-serif text-2xl tracking-tight">
      {APP_NAME}
    </LocalizedLink>
    <div>
      <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  </div>
)
