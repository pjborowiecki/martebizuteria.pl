export const resolveStripeObjectId = (reference: string | { readonly id: string } | null): string | undefined =>
  typeof reference === "string" ? reference : reference?.id

interface CheckoutSessionPayment {
  readonly payment_intent: string | { readonly next_action: { readonly type: string } | null; readonly status: string } | null
  readonly payment_status: string
  readonly status: string | null
}

const isPaymentIntentUnderWay = (paymentIntent: CheckoutSessionPayment["payment_intent"]): boolean =>
  typeof paymentIntent === "object" &&
  paymentIntent !== null &&
  (paymentIntent.status === "processing" ||
    (paymentIntent.status === "requires_action" && paymentIntent.next_action?.type === "blik_authorize"))

export const isCheckoutSessionProcessing = ({
  payment_intent: paymentIntent,
  payment_status: paymentStatus,
  status,
}: CheckoutSessionPayment): boolean =>
  status === "complete" ? paymentStatus === "unpaid" : status === "open" && isPaymentIntentUnderWay(paymentIntent)
