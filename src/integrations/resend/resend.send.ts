import { env } from "cloudflare:workers"

import { type ReactElement } from "react"

import { resend } from "~/src/integrations/resend/resend.config"

import { APP_NAME } from "~/src/presentation/branding/app"

export const SEND_EMAIL_TIMEOUT_MS = 10_000

const deliver = async ({ from, react, subject, to }: Readonly<SendEmailOptions>): Promise<string | undefined> => {
  try {
    const { error } = await resend.emails.send({
      from: from ?? `${APP_NAME} <${env.RESEND_EMAIL_FROM}>`,
      react,
      subject,
      to,
    })

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
  readonly subject: string
  readonly to: string
}
