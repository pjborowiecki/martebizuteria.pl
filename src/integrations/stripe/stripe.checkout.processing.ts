import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

export class ProcessingCheckoutSessionError extends Error {
  readonly sessionId: string

  constructor(sessionId: string) {
    super(CHECKOUT_ERROR_CODES.SESSION_PROCESSING)
    this.name = "ProcessingCheckoutSessionError"
    this.sessionId = sessionId
  }
}
