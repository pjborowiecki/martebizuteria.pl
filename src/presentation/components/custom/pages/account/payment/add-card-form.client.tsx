import { type JSX, useMemo } from "react"

import { Elements } from "@stripe/react-stripe-js"
import { type StripeElementsOptionsClientSecret } from "@stripe/stripe-js"
import { useQuery } from "@tanstack/react-query"
import "@tanstack/react-start/client-only"
import { useTheme } from "@wrksz/themes/client"
import { useLocale } from "use-intl/react"

import { STRIPE_FONTS, getStripeAppearance } from "~/src/integrations/stripe/stripe.appearance"
import { stripeJsQuery, toStripeLocale } from "~/src/integrations/stripe/stripe.client"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { AddCardFields } from "~/src/presentation/components/custom/pages/account/payment/add-card-fields.client"
import { AddCardUnavailable } from "~/src/presentation/components/custom/pages/account/payment/add-card-unavailable"

export const AddCardForm = ({ clientSecret, onCancel, onSetupEnded }: Readonly<AddCardFormProps>): JSX.Element => {
  const locale = useLocale()
  const { theme } = useTheme()
  const { data: stripe, isPending } = useQuery(stripeJsQuery(locale))
  const options = useMemo<StripeElementsOptionsClientSecret>(
    () => ({
      appearance: getStripeAppearance(theme === "dark" ? "dark" : "light"),
      clientSecret,
      fonts: STRIPE_FONTS,
      locale: toStripeLocale(locale),
    }),
    [clientSecret, locale, theme],
  )

  if (isPending) {
    return <Skeleton className="my-6 h-28 w-full rounded-none" />
  }

  if (stripe === undefined || stripe === null) {
    return <AddCardUnavailable onCancel={onCancel} />
  }

  return (
    <Elements key={clientSecret} options={options} stripe={stripe}>
      <AddCardFields onCancel={onCancel} onFailed={onSetupEnded} onSaved={onSetupEnded} />
    </Elements>
  )
}

interface AddCardFormProps {
  readonly clientSecret: string
  readonly onCancel: () => void
  readonly onSetupEnded: () => void
}
