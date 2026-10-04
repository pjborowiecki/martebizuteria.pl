import { type DOMAttributes, type JSX, type MouseEvent, useCallback, useState } from "react"

import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import {
  type Stripe,
  type StripeElements,
  type StripeError,
  type StripePaymentElement,
  type StripePaymentElementOptions,
} from "@stripe/stripe-js"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import "@tanstack/react-start/client-only"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"

import { PAYMENT_METHOD_QUERY_KEYS } from "~/src/modules/payment/payment.constants"
import { removeDuplicateSavedCardsMutation } from "~/src/modules/payment/use-cases/remove-duplicate-saved-cards"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

const PAYMENT_ELEMENT_OPTIONS: StripePaymentElementOptions = {
  wallets: {
    applePay: "never",
    googlePay: "never",
    link: "never",
  },
}

const ERROR_TYPES_THE_SHOPPER_CAN_FIX = new Set<StripeError["type"]>(["card_error", "validation_error"])

const keepFocusInCardFields = (event: MouseEvent<HTMLButtonElement>): void => {
  event.preventDefault()
}

export const AddCardFields = ({ onCancel, onFailed, onSaved }: Readonly<AddCardFieldsProps>): JSX.Element => {
  const t = useTranslations("pages.account.payment")
  const stripe = useStripe()
  const elements = useElements()
  const queryClient = useQueryClient()
  const [elementStatus, setElementStatus] = useState<ElementStatus>("loading")

  const finishSaving = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_QUERY_KEYS.SAVED })
    toast.success(t("added"))
    onSaved()
  }, [onSaved, queryClient, t])

  const failForGood = useCallback(async () => {
    toast.error(t("addError"))
    await queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_QUERY_KEYS.SAVED })
    onFailed()
  }, [onFailed, queryClient, t])

  const { isPending: isRemovingDuplicates, mutate: removeDuplicates } = useMutation({
    ...removeDuplicateSavedCardsMutation,
    onSettled: finishSaving,
  })

  const { isPending: isConfirming, mutate: confirmSetup } = useMutation({
    mutationFn: (handles: StripeHandles) =>
      handles.stripe.confirmSetup({
        confirmParams: { payment_method_data: { allow_redisplay: "always" } },
        elements: handles.elements,
        redirect: "if_required",
      }),
    onError: failForGood,
    onSuccess: async (result) => {
      if (result.error === undefined) {
        const paymentMethodId = resolveStripeObjectId(result.setupIntent.payment_method)
        if (paymentMethodId === undefined) {
          await finishSaving()
        } else {
          removeDuplicates({ paymentMethodId })
        }

        return
      }

      if (ERROR_TYPES_THE_SHOPPER_CAN_FIX.has(result.error.type)) {
        toast.error(result.error.message ?? t("addError"))

        return
      }

      await failForGood()
    },
  })

  const isSaving = isConfirming || isRemovingDuplicates

  const handleReady = useCallback((element: StripePaymentElement) => {
    setElementStatus("ready")
    element.focus()
  }, [])

  const handleLoadError = useCallback(() => {
    setElementStatus("failed")
  }, [])

  const handleSubmit = useCallback<NonNullable<DOMAttributes<HTMLFormElement>["onSubmit"]>>(
    (event) => {
      event.preventDefault()
      if (stripe !== null && elements !== null && elementStatus === "ready" && !isSaving) {
        confirmSetup({ elements, stripe })
      }
    },
    [confirmSetup, elementStatus, elements, isSaving, stripe],
  )

  return (
    <form aria-label={t("addCard")} className="border-b border-border py-6" onSubmit={handleSubmit}>
      {elementStatus === "loading" && <Skeleton className="h-28 w-full rounded-none" />}
      {elementStatus === "failed" && (
        <p className="text-sm text-destructive" role="alert">
          {t("formUnavailable")}
        </p>
      )}
      <PaymentElement onLoadError={handleLoadError} onReady={handleReady} options={PAYMENT_ELEMENT_OPTIONS} />
      <p className="mt-4 max-w-md text-[12px] leading-relaxed text-muted-foreground">{t("addCardHint")}</p>
      <div className="mt-6 flex items-center gap-4">
        <Button disabled={elementStatus !== "ready" || isSaving} size="account" type="submit" variant="account">
          {isSaving ? t("saving") : t("saveCard")}
        </Button>
        <Button disabled={isSaving} onClick={onCancel} onMouseDown={keepFocusInCardFields} type="button" variant="account-ghost">
          {t("cancel")}
        </Button>
      </div>
    </form>
  )
}

type ElementStatus = "failed" | "loading" | "ready"

interface StripeHandles {
  readonly elements: StripeElements
  readonly stripe: Stripe
}

interface AddCardFieldsProps {
  readonly onCancel: () => void
  readonly onFailed: () => void
  readonly onSaved: () => void
}
