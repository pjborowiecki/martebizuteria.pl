import { type BaseSyntheticEvent, type JSX, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { CheckoutElementsProvider, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout"
import { type StripeCheckoutElementsSdkOptions, type StripeCheckoutPaymentElementOptions } from "@stripe/stripe-js"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import "@tanstack/react-start/client-only"
import { useTheme } from "@wrksz/themes/client"
import { cn } from "cn"
import { AlertCircle, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { getStripeAppearance } from "~/src/integrations/stripe/stripe.appearance"
import {
  buildCheckoutLinesFingerprint,
  buildCheckoutValuesFingerprint,
  confirmCheckoutSession,
  ensureCheckoutSession,
  resetCheckoutSession,
} from "~/src/integrations/stripe/stripe.checkout"
import { getStripe } from "~/src/integrations/stripe/stripe.client"
import { CHECKOUT_PAYMENT_METHOD_ORDER } from "~/src/integrations/stripe/stripe.constants"
import { getCheckoutErrorKey } from "~/src/integrations/stripe/stripe.errors"

import { useCartStore } from "~/src/modules/cart/cart.store"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { listDeliveryMethodsQuery } from "~/src/modules/delivery-method/use-cases/list-delivery-methods"

import { useCartAvailability } from "~/src/hooks/use-cart-availability"

import { Button, buttonVariants } from "~/src/presentation/components/shadcn/button"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
import { CHECKOUT_STEP_ID } from "~/src/presentation/components/custom/checkout/lib/checkout-steps"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

const isCheckoutComplete = (values: CheckoutFormSchema): boolean =>
  Boolean(
    values.email &&
    values.phone &&
    values.firstName &&
    values.lastName &&
    values.address1 &&
    values.city &&
    values.postalCode &&
    values.deliveryMethod,
  )

const PaymentSkeleton = (): JSX.Element => (
  <div className="space-y-4">
    <Skeleton className="h-12 w-full rounded-none" />
    <Skeleton className="h-12 w-full rounded-none" />
    <Skeleton className="h-12 w-2/3 rounded-none" />
  </div>
)

const PaymentError = ({
  onRetry,
}: Readonly<{
  onRetry: () => void
}>): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutForm")

  return (
    <div className="flex flex-col items-center gap-4 border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <AlertCircle aria-hidden className="size-7 text-destructive" strokeWidth={1.3} />
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">{t("paymentUnavailable")}</p>
        <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">{t("paymentUnavailableHint")}</p>
      </div>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={onRetry} className="cursor-pointer rounded-none text-xs tracking-[0.15em] uppercase">
          {t("retry")}
        </Button>
        <LocalizedLink
          to={ROUTES.CART}
          className={cn(
            buttonVariants({
              variant: "outline",
            }),
            "rounded-none text-xs tracking-[0.15em] uppercase",
          )}
        >
          {t("backToCart")}
        </LocalizedLink>
      </div>
    </div>
  )
}

const PaymentForm = ({
  checkoutBlocked,
  onReset,
  onRetry,
}: Readonly<{
  checkoutBlocked: boolean
  onReset: () => Promise<void>
  onRetry: () => void
}>): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const navigate = useNavigate()
  const { getValues } = useCheckoutForm()
  const checkoutState = useCheckoutElements()
  const [isReady, setIsReady] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const handleReady = useCallback(() => {
    setIsReady(true)
  }, [])

  const checkout = checkoutState.type === "success" ? checkoutState.checkout : undefined
  const handlePay = useCallback(async () => {
    if (checkout === undefined) {
      return
    }
    setIsProcessing(true)
    try {
      const outcome = await confirmCheckoutSession({
        checkout,
        values: getValues(),
      })

      if (outcome.status === "error") {
        if (outcome.recoverable) {
          await onReset()
          toast.error(t("errors.paymentSessionStale"))
        } else {
          toast.error(outcome.message === "" ? t("validation.paymentFailed") : outcome.message)
        }

        return
      }

      await navigate({
        search: (prev) => ({
          ...prev,
          success: true,
        }),
        to: ".",
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("validation.paymentFailed"))
    } finally {
      setIsProcessing(false)
    }
  }, [checkout, getValues, navigate, onReset, t])

  const onFormSubmit = useCallback(
    (event: BaseSyntheticEvent) => {
      event.preventDefault()
      void handlePay()
    },
    [handlePay],
  )

  if (checkoutState.type === "error") {
    return <PaymentError onRetry={onRetry} />
  }

  return (
    <form onSubmit={onFormSubmit} className="flex flex-col gap-6">
      {!isReady && <PaymentSkeleton />}

      <PaymentElement options={PAYMENT_ELEMENT_OPTIONS} onReady={handleReady} />

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          type="submit"
          disabled={checkoutBlocked || !isReady || isProcessing || checkout === undefined}
          className="group min-h-13 w-full cursor-pointer rounded-none text-sm tracking-[0.2em] uppercase disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          {isProcessing ? t("processingPayment") : t("placeOrder")}
          <ArrowRight aria-hidden className="ml-2 size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.15} />
        </Button>
        <p className="text-center text-xs text-muted-foreground/70 italic">
          {t.rich("termsAgreement", {
            privacy: renderPrivacyLink,
            terms: renderTermsLink,
          })}
        </p>
      </div>
    </form>
  )
}

const useCheckoutSessionLoader = (): CheckoutSessionLoader => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const { theme } = useTheme()
  const { checkoutSession, getValues, onEdit, setCheckoutSession } = useCheckoutForm()
  const cartTotal = useCartStore((state) => state.cartTotal)
  const items = useCartStore((state) => state.items)
  const deliveryMethodId = getValues("deliveryMethod")
  const [loadError, setLoadError] = useState(false)
  const [retryToken, setRetryToken] = useState(0)
  const { data: deliveryMethods, isLoading } = useQuery(listDeliveryMethodsQuery())
  const deliveryCost = deliveryMethods?.find((m) => m.id === deliveryMethodId)?.price ?? 0
  const amountCents = cartTotal() + deliveryCost
  const linesFingerprint = buildCheckoutLinesFingerprint(items)
  const valuesFingerprint = buildCheckoutValuesFingerprint(getValues())
  const sessionMatches =
    checkoutSession?.amount === amountCents &&
    checkoutSession.linesFingerprint === linesFingerprint &&
    checkoutSession.valuesFingerprint === valuesFingerprint
  const inFlightRef = useRef(false)
  const retry = useCallback(() => {
    setLoadError(false)
    setRetryToken((token) => token + 1)
  }, [])

  const resetSession = useCallback(async () => {
    if (checkoutSession === undefined || inFlightRef.current) {
      return
    }
    inFlightRef.current = true
    try {
      const session = await resetCheckoutSession({
        amount: amountCents,
        items,
        session: checkoutSession,
        values: getValues(),
      })
      setCheckoutSession(session)
    } catch (error) {
      setLoadError(true)
      toast.error(t(getCheckoutErrorKey(error)))
    } finally {
      inFlightRef.current = false
    }
  }, [amountCents, checkoutSession, getValues, items, setCheckoutSession, t])
  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!isCheckoutComplete(getValues())) {
      onEdit(CHECKOUT_STEP_ID.CONTACT)

      return
    }

    if (amountCents <= 0 || inFlightRef.current || sessionMatches) {
      return
    }

    const run = async () => {
      inFlightRef.current = true
      setLoadError(false)
      try {
        const session = await ensureCheckoutSession({
          amount: amountCents,
          existing: checkoutSession,
          items,
          values: getValues(),
        })
        setCheckoutSession(session)
      } catch (error) {
        setLoadError(true)
        toast.error(t(getCheckoutErrorKey(error)))
      } finally {
        inFlightRef.current = false
      }
    }
    void run()
  }, [
    amountCents,
    isLoading,
    checkoutSession,
    getValues,
    items,
    onEdit,
    setCheckoutSession,
    t,
    retryToken,
    sessionMatches,
    valuesFingerprint,
  ])

  const options = useMemo<StripeCheckoutElementsSdkOptions | undefined>(() => {
    if (checkoutSession === undefined || !sessionMatches) {
      return
    }

    return {
      clientSecret: checkoutSession.clientSecret,
      elementsOptions: {
        appearance: getStripeAppearance(theme === "dark" ? "dark" : "light"),
        fonts: [
          {
            cssSrc: FONT_CSS_SRC,
          },
        ],
      },
    }
  }, [checkoutSession, sessionMatches, theme])

  return {
    isLoading,
    loadError,
    options,
    resetSession,
    retry,
    sessionId: checkoutSession?.sessionId,
  }
}

export const PaymentStep = (): JSX.Element => {
  const locale = useLocale()
  const t = useTranslations("pages.checkout.checkoutForm")
  const { hasUnavailableItems, isChecking } = useCartAvailability()
  const checkoutBlocked = hasUnavailableItems || isChecking
  const stripePromise = useMemo(() => getStripe(locale), [locale])
  const { isLoading, loadError, options, resetSession, retry, sessionId } = useCheckoutSessionLoader()
  if (loadError && options === undefined) {
    return <PaymentError onRetry={retry} />
  }

  if (isLoading || options === undefined) {
    return <PaymentSkeleton />
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{t("paymentMethodsIntro")}</p>
      <div className="mt-4">
        <CheckoutElementsProvider key={sessionId} stripe={stripePromise} options={options}>
          <PaymentForm checkoutBlocked={checkoutBlocked} onReset={resetSession} onRetry={retry} />
        </CheckoutElementsProvider>
      </div>
    </div>
  )
}

const FONT_CSS_SRC = "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600&display=swap"

const PAYMENT_ELEMENT_OPTIONS: StripeCheckoutPaymentElementOptions = {
  fields: {
    billingDetails: "never",
  },
  layout: {
    radios: "always",
    spacedAccordionItems: true,
    type: "accordion",
  },
  paymentMethodOrder: [...CHECKOUT_PAYMENT_METHOD_ORDER],
  wallets: {
    applePay: "never",
    googlePay: "never",
    link: "never",
  },
}

const renderTermsLink = (chunks: ReactNode): JSX.Element => (
  <LocalizedLink to={ROUTES.TERMS_OF_SERVICE} className="underline underline-offset-4 hover:text-foreground">
    {chunks}
  </LocalizedLink>
)

const renderPrivacyLink = (chunks: ReactNode): JSX.Element => (
  <LocalizedLink to={ROUTES.PRIVACY_POLICY} className="underline underline-offset-4 hover:text-foreground">
    {chunks}
  </LocalizedLink>
)

interface CheckoutSessionLoader {
  isLoading: boolean
  loadError: boolean
  options: StripeCheckoutElementsSdkOptions | undefined
  resetSession: () => Promise<void>
  retry: () => void
  sessionId: string | undefined
}
