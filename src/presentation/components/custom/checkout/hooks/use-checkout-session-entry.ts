import { useEffect, useState } from "react"

import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { useCartHydrated, useCartStore } from "~/src/modules/cart/cart.store"
import { type CheckoutSessionStatus, checkoutSessionStatusQuery } from "~/src/modules/checkout/use-cases/get-checkout-session-status"

import {
  forgetCheckoutSessionId,
  loadCheckoutSessionId,
  wasCheckoutSessionOpenedForAnotherCart,
} from "~/src/presentation/components/custom/checkout/lib/checkout-draft"
import { CHECKOUT_STEP_DEFINITIONS } from "~/src/presentation/components/custom/checkout/lib/checkout-steps"

export type CheckoutEntryView = "checking" | "checkout" | "confirmation"

type ArrivalView = Exclude<CheckoutEntryView, "confirmation">

const PAYMENT_STEP = CHECKOUT_STEP_DEFINITIONS.length

const resolveCheckoutEntryView = ({ arrivalView, isError, returned, sessionId, status }: CheckoutEntryState): CheckoutEntryView => {
  if (sessionId === undefined || isError) {
    return returned ? "confirmation" : "checkout"
  }

  if (returned) {
    return status === "complete" ? "confirmation" : "checking"
  }

  return arrivalView ?? "checking"
}

export const useCheckoutSessionEntry = ({ session_id: returnedSessionId, success }: CheckoutEntrySearch): CheckoutEntryView => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const navigate = useNavigate()
  const cartHydrated = useCartHydrated()
  const cart = useCartStore((state) => state.items)
  const returned = success === true
  const [storedSessionId] = useState(loadCheckoutSessionId)
  const sessionId = returned ? returnedSessionId : storedSessionId
  const { data: status, isError } = useQuery(checkoutSessionStatusQuery(sessionId))
  const [arrivalView, setArrivalView] = useState<ArrivalView>()

  useEffect(() => {
    if (!returned || sessionId === undefined || status === undefined || status === "complete") {
      return
    }

    if (status === "closed") {
      forgetCheckoutSessionId(sessionId)
    }
    toast.error(t("errors.paymentNotCompleted"))
    void navigate({ replace: true, search: { step: PAYMENT_STEP }, to: "." })
  }, [navigate, returned, sessionId, status, t])

  useEffect(() => {
    if (returned || sessionId === undefined || status === undefined || arrivalView !== undefined || !cartHydrated) {
      return
    }

    const paidForThisCart = status === "complete" && !wasCheckoutSessionOpenedForAnotherCart(sessionId, cart)
    if (paidForThisCart) {
      void navigate({ replace: true, search: { session_id: sessionId, success: true }, to: "." })
    } else if (status !== "open") {
      forgetCheckoutSessionId(sessionId)
    }

    setArrivalView(paidForThisCart ? "checking" : "checkout")
  }, [arrivalView, cart, cartHydrated, navigate, returned, sessionId, status])

  return resolveCheckoutEntryView({ arrivalView, isError, returned, sessionId, status })
}

interface CheckoutEntrySearch {
  readonly session_id?: string | undefined
  readonly success?: boolean | undefined
}

interface CheckoutEntryState {
  readonly arrivalView: ArrivalView | undefined
  readonly isError: boolean
  readonly returned: boolean
  readonly sessionId: string | undefined
  readonly status: CheckoutSessionStatus | undefined
}
