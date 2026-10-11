import { APIError } from "better-auth/api"

import { EMAIL_DELIVERY_FAILED } from "~/src/integrations/better-auth/auth.constants"
import { sendEmail } from "~/src/integrations/resend/resend.send"

import { recordEmailFailedAudit } from "~/src/modules/audit-log/audit-log.events.server"

export const recordAuthEmailFailure = (kind: string, recipient: string, failure: string): void => {
  console.error(`[Auth] Failed to send ${kind} email to ${recipient}: ${failure}`)
  recordEmailFailedAudit(recipient, { detail: `Auth ${kind} email — ${failure}` })
}

export const deliverAuthEmail = async (kind: string, email: Parameters<typeof sendEmail>[0]): Promise<boolean> => {
  const failure = await sendEmail(email)
  if (failure === undefined) {
    return true
  }

  recordAuthEmailFailure(kind, email.to, failure)

  return false
}

export const requireAuthEmailDelivery = async (kind: string, email: Parameters<typeof sendEmail>[0]): Promise<void> => {
  if (!(await deliverAuthEmail(kind, { ...email, revealsAccountExistence: true }))) {
    throw APIError.from("SERVICE_UNAVAILABLE", EMAIL_DELIVERY_FAILED)
  }
}

export interface AuthEmailParams {
  readonly url: string
  readonly user: {
    readonly email: string
    readonly name: string
  }
}
