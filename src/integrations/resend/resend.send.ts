import { env } from "cloudflare:workers"

import { type ReactElement } from "react"

import { type ErrorResponse } from "resend"

import { markEmailSenderUnavailable } from "~/src/integrations/resend/resend.availability.server"
import { resend } from "~/src/integrations/resend/resend.config"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { scheduleBackgroundWork } from "~/src/lib/background"

import { APP_NAME } from "~/src/presentation/branding/app"

export const SEND_EMAIL_TIMEOUT_MS = 10_000

const SENDER_REFUSAL_STATUSES: ReadonlySet<number | null> = new Set([HTTP_STATUS.FORBIDDEN, HTTP_STATUS.UNAUTHORIZED])

const SENDER_REFUSAL_NAMES: ReadonlySet<string> = new Set([
  "daily_quota_exceeded",
  "invalid_api_key",
  "invalid_from_address",
  "monthly_quota_exceeded",
  "restricted_api_key",
])

const refusesEverySend = ({ name, statusCode }: ErrorResponse): boolean =>
  SENDER_REFUSAL_NAMES.has(name) || SENDER_REFUSAL_STATUSES.has(statusCode)

const deliver = async ({ from, react, revealsAccountExistence, subject, to }: Readonly<SendEmailOptions>): Promise<string | undefined> => {
  try {
    const { error } = await resend.emails.send({
      from: from ?? `${APP_NAME} <${env.RESEND_EMAIL_FROM}>`,
      react,
      subject,
      to,
    })

    if (error !== null && revealsAccountExistence !== true && refusesEverySend(error)) {
      scheduleBackgroundWork(markEmailSenderUnavailable(error.message))
    }

    return error?.message
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

export const sendEmail = async (options: Readonly<SendEmailOptions>): Promise<string | undefined> => {
  const timeout = Promise.withResolvers<string>()
  const timer = setTimeout(() => {
    timeout.resolve(`Resend did not answer within ${SEND_EMAIL_TIMEOUT_MS} ms`)
  }, SEND_EMAIL_TIMEOUT_MS)

  try {
    return await Promise.race([deliver(options), timeout.promise])
  } finally {
    clearTimeout(timer)
  }
}

interface SendEmailOptions {
  readonly from?: string
  readonly react: ReactElement
  readonly revealsAccountExistence?: boolean
  readonly subject: string
  readonly to: string
}
