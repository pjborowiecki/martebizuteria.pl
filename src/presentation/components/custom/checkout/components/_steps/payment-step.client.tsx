import { type BaseSyntheticEvent, type JSX, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { CheckoutElementsProvider, PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout"
import { type StripeCheckoutElementsSdkOptions, type StripeCheckoutPaymentElementOptions } from "@stripe/stripe-js"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import "@tanstack/react-start/client-only"
import { useTheme } from "@wrksz/themes/client"
import { cn } from "cn"
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { STRIPE_FONTS, getStripeAppearance } from "~/src/integrations/stripe/stripe.appearance"
import {
  type CheckoutSession,
  PaidCheckoutSessionError,
  buildCheckoutValuesFingerprint,
  confirmCheckoutSession,
  ensureCheckoutSession,
  isCheckoutSessionFor,
  resetCheckoutSession,
} from "~/src/integrations/stripe/stripe.checkout"
import { ProcessingCheckoutSessionError } from "~/src/integrations/stripe/stripe.checkout.processing"
import { getStripe } from "~/src/integrations/stripe/stripe.client"
import { CHECKOUT_PAYMENT_METHOD_ORDER } from "~/src/integrations/stripe/stripe.constants"
import { CHECKOUT_ERROR_CODES, getCheckoutErrorKey } from "~/src/integrations/stripe/stripe.errors"

import { CART_QUERY_KEYS } from "~/src/modules/cart/cart.constants"
import { useCartStore } from "~/src/modules/cart/cart.store"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
import { type CheckoutSessionStatus, checkoutSessionStatusQuery } from "~/src/modules/checkout/use-cases/get-checkout-session-status"
import { DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

import { useCartAvailability } from "~/src/hooks/use-cart-availability"

import { Button, buttonVariants } from "~/src/presentation/components/shadcn/button"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
import {
  forgetCheckoutSessionId,
  loadCheckoutSessionId,
  wasCheckoutSessionOpenedForAnotherCart,
} from "~/src/presentation/components/custom/checkout/lib/checkout-draft"
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

const PROCESSING_SESSION_POLL_INTERVAL_MS = 8000

const PAYMENT_ERROR_COPY = {
  expired: { action: "restartPayment", hint: "paymentExpiredHint", title: "paymentExpired" },
  unavailable: { action: "retry", hint: "paymentUnavailableHint", title: "paymentUnavailable" },
} as const

const PaymentError = ({
  onRetry,
  reason,
}: Readonly<{
  onRetry: () => void
  reason: keyof typeof PAYMENT_ERROR_COPY
}>): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const copy = PAYMENT_ERROR_COPY[reason]

  return (
    <div className="flex flex-col items-center gap-4 border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <AlertCircle aria-hidden className="size-7 text-destructive" strokeWidth={1.3} />
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">{t(copy.title)}</p>
        <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">{t(copy.hint)}</p>
      </div>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={onRetry} className="cursor-pointer rounded-none text-xs tracking-[0.15em] uppercase">
          {t(copy.action)}
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

const PaymentAwaitingBank = ({
  onSettled,
  sessionId,
}: Readonly<{
  onSettled: SettleProcessingSession
  sessionId: string
}>): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const { data: status } = useQuery({
    ...checkoutSessionStatusQuery(sessionId),
    refetchInterval: PROCESSING_SESSION_POLL_INTERVAL_MS,
    staleTime: 0,
  })
  useEffect(() => {
    if (status !== undefined && status !== "processing") {
      void onSettled(sessionId, status)
    }
  }, [onSettled, sessionId, status])

  return (
    <div role="status" className="flex flex-col items-center gap-4 border border-border px-6 py-10 text-center">
      <Loader2 aria-hidden className="size-7 animate-spin text-muted-foreground" strokeWidth={1.3} />
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">{t("paymentAwaitingBank")}</p>
        <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">{t("paymentAwaitingBankHint")}</p>
      </div>
    </div>
  )
}

const useCheckoutConfirmation = (): ((sessionId: string) => Promise<void>) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useCallback(
    async (sessionId: string) => {
      queryClient.setQueryData(checkoutSessionStatusQuery(sessionId).queryKey, "complete")
      await navigate({
        search: (prev) => ({
          ...prev,
          session_id: sessionId,
          success: true,
        }),
        to: ".",
      })
    },
    [navigate, queryClient],
  )
}

const PaymentForm = ({
  checkoutBlocked,
  onProcessing,
  onReset,
  onRetry,
}: Readonly<{
  checkoutBlocked: boolean
  onProcessing: (sessionId: string) => void
  onReset: () => Promise<PaymentStepDestination>
  onRetry: () => void
}>): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const showConfirmation = useCheckoutConfirmation()
  const { checkoutSession, getValues } = useCheckoutForm()
  const checkoutState = useCheckoutElements()
  const [isReady, setIsReady] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const handleReady = useCallback(() => {
    setIsReady(true)
  }, [])

  const checkout = checkoutState.type === "success" ? checkoutState.checkout : undefined
  const placeOrderLabel = checkout === undefined ? t("placeOrder") : t("placeOrderFor", { amount: checkout.total.total.amount })
  const handlePay = useCallback(async () => {
    if (checkout === undefined || checkoutSession === undefined) {
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
          const destination = await onReset()
          if (destination === "payment") {
            toast.error(t("errors.paymentSessionStale"))
          }
        } else {
          toast.error(outcome.message === "" ? t("validation.paymentFailed") : outcome.message)
        }

        return
      }

      if (outcome.status === "processing") {
        onProcessing(checkoutSession.sessionId)

        return
      }

      await showConfirmation(checkoutSession.sessionId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("validation.paymentFailed"))
    } finally {
      setIsProcessing(false)
    }
  }, [checkout, checkoutSession, getValues, onProcessing, onReset, showConfirmation, t])

  const onFormSubmit = useCallback(
    (event: BaseSyntheticEvent) => {
      event.preventDefault()
      void handlePay()
    },
    [handlePay],
  )

  if (checkoutState.type === "error") {
    return <PaymentError onRetry={onRetry} reason="unavailable" />
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
          {isProcessing ? t("processingPayment") : placeOrderLabel}
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

const UNAVAILABLE_CART_ITEM_ERROR_CODES: ReadonlySet<string> = new Set([
  CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY,
  CHECKOUT_ERROR_CODES.PRODUCT_NOT_FOUND,
])

const REFUSED_DELIVERY_ERROR_CODES: ReadonlySet<string> = new Set([
  CHECKOUT_ERROR_CODES.DELIVERY_METHOD_UNAVAILABLE,
  CHECKOUT_ERROR_CODES.LOCKER_NOT_FOUND,
  CHECKOUT_ERROR_CODES.LOCKER_REQUIRED,
])

const useCheckoutSessionFailure = (): CheckoutSessionFailure => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const queryClient = useQueryClient()
  const { onEdit } = useCheckoutForm()
  const [loadError, setLoadError] = useState(false)
  const reportFailure = useCallback(
    (error: unknown) => {
      setLoadError(true)
      toast.error(t(getCheckoutErrorKey(error)))
      if (error instanceof Error && UNAVAILABLE_CART_ITEM_ERROR_CODES.has(error.message)) {
        void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEYS.AVAILABILITY })
      }

      if (error instanceof Error && REFUSED_DELIVERY_ERROR_CODES.has(error.message)) {
        void queryClient.invalidateQueries({ queryKey: DELIVERY_METHOD_QUERY_KEYS.ALL })
        onEdit(CHECKOUT_STEP_ID.DELIVERY)
      }

      if (error instanceof Error && error.message === CHECKOUT_ERROR_CODES.SALES_PAUSED) {
        void queryClient.invalidateQueries({ queryKey: STORE_SETTING_QUERY_KEYS.SALES })
      }
    },
    [onEdit, queryClient, t],
  )

  return { loadError, reportFailure, setLoadError }
}

const useCheckoutSessionOutcome = (): CheckoutSessionOutcome => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const queryClient = useQueryClient()
  const items = useCartStore((state) => state.items)
  const showConfirmation = useCheckoutConfirmation()
  const { loadError, reportFailure, setLoadError } = useCheckoutSessionFailure()
  const [retryToken, setRetryToken] = useState(0)
  const [processingSessionId, setProcessingSessionId] = useState<string>()
  const retry = useCallback(() => {
    setLoadError(false)
    setProcessingSessionId(undefined)
    setRetryToken((token) => token + 1)
  }, [setLoadError])
  const openPaidSession = useCallback(
    async (sessionId: string): Promise<PaymentStepDestination> => {
      if (wasCheckoutSessionOpenedForAnotherCart(sessionId, items)) {
        forgetCheckoutSessionId(sessionId)
        retry()

        return "payment"
      }

      await showConfirmation(sessionId)

      return "confirmation"
    },
    [items, retry, showConfirmation],
  )
  const awaitBank = useCallback(
    (sessionId: string) => {
      queryClient.setQueryData(checkoutSessionStatusQuery(sessionId).queryKey, "processing")
      setProcessingSessionId(sessionId)
    },
    [queryClient],
  )
  const handleSessionError = useCallback(
    (error: unknown): Promise<PaymentStepDestination> => {
      if (error instanceof PaidCheckoutSessionError) {
        return openPaidSession(error.sessionId)
      }

      if (error instanceof ProcessingCheckoutSessionError) {
        awaitBank(error.sessionId)

        return Promise.resolve("processing")
      }

      reportFailure(error)

      return Promise.resolve("payment")
    },
    [awaitBank, openPaidSession, reportFailure],
  )
  const settleProcessingSession = useCallback(
    async (sessionId: string, status: CheckoutSessionStatus) => {
      if (status === "complete") {
        await openPaidSession(sessionId)

        return
      }

      toast.error(t("errors.paymentNotCompleted"))
      retry()
    },
    [openPaidSession, retry, t],
  )

  return { awaitBank, handleSessionError, loadError, processingSessionId, retry, retryToken, setLoadError, settleProcessingSession }
}

const useCheckoutSessionLoader = (): CheckoutSessionLoader => {
  const { theme } = useTheme()
  const { checkoutSession, getValues, onEdit, setCheckoutSession } = useCheckoutForm()
  const items = useCartStore((state) => state.items)
  const applyCurrentPrices = useCartStore((state) => state.applyCurrentPrices)
  const { awaitBank, handleSessionError, loadError, processingSessionId, retry, retryToken, setLoadError, settleProcessingSession } =
    useCheckoutSessionOutcome()
  const valuesFingerprint = buildCheckoutValuesFingerprint(getValues())
  const sessionMatches = checkoutSession !== undefined && isCheckoutSessionFor(checkoutSession, { items, values: getValues() })
  const inFlightRef = useRef(false)
  const adoptSession = useCallback(
    (session: CheckoutSession) => {
      applyCurrentPrices(session.lines)
      setCheckoutSession(session)
    },
    [applyCurrentPrices, setCheckoutSession],
  )

  const resetSession = useCallback(async (): Promise<PaymentStepDestination> => {
    if (checkoutSession === undefined || inFlightRef.current) {
      return "payment"
    }
    inFlightRef.current = true
    try {
      const session = await resetCheckoutSession({
        heldSessionId: loadCheckoutSessionId(),
        items,
        session: checkoutSession,
        values: getValues(),
      })
      adoptSession(session)

      return "payment"
    } catch (error) {
      return await handleSessionError(error)
    } finally {
      inFlightRef.current = false
    }
  }, [adoptSession, checkoutSession, getValues, handleSessionError, items])
  const settleSession = useCallback(
    async (sessionId: string, status: CheckoutSessionStatus) => {
      await settleProcessingSession(sessionId, status)
      if (status === "closed") {
        await resetSession()
      }
    },
    [resetSession, settleProcessingSession],
  )
  useEffect(() => {
    if (!isCheckoutComplete(getValues())) {
      onEdit(CHECKOUT_STEP_ID.CONTACT)

      return
    }

    if (items.length === 0 || inFlightRef.current || sessionMatches || processingSessionId !== undefined) {
      return
    }

    const run = async () => {
      inFlightRef.current = true
      setLoadError(false)
      try {
        const session = await ensureCheckoutSession({
          existing: checkoutSession,
          heldSessionId: loadCheckoutSessionId(),
          items,
          values: getValues(),
        })
        adoptSession(session)
      } catch (error) {
        await handleSessionError(error)
      } finally {
        inFlightRef.current = false
      }
    }
    void run()
  }, [
    adoptSession,
    checkoutSession,
    getValues,
    handleSessionError,
    items,
    onEdit,
    processingSessionId,
    setLoadError,
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
        fonts: STRIPE_FONTS,
      },
    }
  }, [checkoutSession, sessionMatches, theme])

  return {
    awaitBank,
    checkoutSession,
    loadError,
    options,
    processingSessionId,
    resetSession,
    retry,
    settleSession,
  }
}

const useCheckoutSessionExpired = (checkoutSession: CheckoutSession | undefined): boolean => {
  const [expiredSession, setExpiredSession] = useState<CheckoutSession>()
  useEffect(() => {
    if (checkoutSession === undefined) {
      return
    }

    const expiry = globalThis.setTimeout(
      () => {
        setExpiredSession(checkoutSession)
      },
      Math.max(0, checkoutSession.expiresAt - Date.now()),
    )

    return () => {
      globalThis.clearTimeout(expiry)
    }
  }, [checkoutSession])

  return checkoutSession !== undefined && expiredSession === checkoutSession
}

export const PaymentStep = (): JSX.Element => {
  const locale = useLocale()
  const t = useTranslations("pages.checkout.checkoutForm")
  const { hasUnavailableItems, isChecking } = useCartAvailability()
  const checkoutBlocked = hasUnavailableItems || isChecking
  const stripePromise = useMemo(() => getStripe(locale), [locale])
  const { awaitBank, checkoutSession, loadError, options, processingSessionId, resetSession, retry, settleSession } =
    useCheckoutSessionLoader()
  const isExpired = useCheckoutSessionExpired(checkoutSession)
  const restartPayment = useCallback(() => {
    void resetSession()
  }, [resetSession])
  if (processingSessionId !== undefined) {
    return <PaymentAwaitingBank onSettled={settleSession} sessionId={processingSessionId} />
  }

  if (isExpired) {
    return <PaymentError onRetry={restartPayment} reason="expired" />
  }

  if (loadError && options === undefined) {
    return <PaymentError onRetry={retry} reason="unavailable" />
  }

  if (options === undefined) {
    return <PaymentSkeleton />
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{t("paymentMethodsIntro")}</p>
      <div className="mt-4">
        <CheckoutElementsProvider key={checkoutSession?.sessionId} stripe={stripePromise} options={options}>
          <PaymentForm checkoutBlocked={checkoutBlocked} onProcessing={awaitBank} onReset={resetSession} onRetry={retry} />
        </CheckoutElementsProvider>
      </div>
    </div>
  )
}

const PAYMENT_ELEMENT_OPTIONS: StripeCheckoutPaymentElementOptions = {
  fields: {
    billingDetails: {
      address: { city: "never", country: "never", line1: "never", line2: "never", postalCode: "never", state: "auto" },
      email: "never",
      name: "never",
      phone: "never",
    },
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

interface CheckoutSessionFailure {
  loadError: boolean
  reportFailure: (error: unknown) => void
  setLoadError: (failed: boolean) => void
}

type PaymentStepDestination = "confirmation" | "payment" | "processing"

type SettleProcessingSession = (sessionId: string, status: CheckoutSessionStatus) => Promise<void>

interface CheckoutSessionOutcome {
  awaitBank: (sessionId: string) => void
  handleSessionError: (error: unknown) => Promise<PaymentStepDestination>
  loadError: boolean
  processingSessionId: string | undefined
  retry: () => void
  retryToken: number
  setLoadError: (failed: boolean) => void
  settleProcessingSession: SettleProcessingSession
}

interface CheckoutSessionLoader {
  awaitBank: (sessionId: string) => void
  checkoutSession: CheckoutSession | undefined
  loadError: boolean
  options: StripeCheckoutElementsSdkOptions | undefined
  processingSessionId: string | undefined
  resetSession: () => Promise<PaymentStepDestination>
  retry: () => void
  settleSession: SettleProcessingSession
}
