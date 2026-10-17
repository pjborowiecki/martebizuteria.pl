import { APIError } from "better-auth/api"

import { EMAIL_DELIVERY_FAILED } from "~/src/integrations/better-auth/auth.constants"
import { sendEmail } from "~/src/integrations/resend/resend.send"

import { type AuditEmailKind } from "~/src/modules/audit-log/audit-log.constants"
import { recordEmailFailedAudit } from "~/src/modules/audit-log/audit-log.events.server"

export const recordAuthEmailFailure = (kind: AuditEmailKind, { failure, to, userId }: Readonly<AuthEmailFailure>): void => {
  console.error(`[Auth] Failed to send ${kind} email to ${to}: ${failure}`)
  recordEmailFailedAudit(to, { detail: failure, metadata: { emailKind: kind }, resourceId: userId })
}

export const deliverAuthEmail = async (kind: AuditEmailKind, { userId, ...email }: Readonly<AuthEmail>): Promise<boolean> => {
  const failure = await sendEmail(email)
  if (failure === undefined) {
    return true
  }

  recordAuthEmailFailure(kind, { failure, to: email.to, userId })

  return false
}

export const requireAuthEmailDelivery = async (kind: AuditEmailKind, email: Readonly<AuthEmail>): Promise<void> => {
  if (!(await deliverAuthEmail(kind, { ...email, revealsAccountExistence: true }))) {
    throw APIError.from("SERVICE_UNAVAILABLE", EMAIL_DELIVERY_FAILED)
  }
}

export interface AuthEmailParams {
  readonly url: string
  readonly user: {
    readonly email: string
    readonly id: string
    readonly name: string
  }
}

type AuthEmail = Parameters<typeof sendEmail>[0] & { readonly userId?: string | undefined }

interface AuthEmailFailure {
  readonly failure: string
  readonly to: string
  readonly userId?: string | undefined
}
