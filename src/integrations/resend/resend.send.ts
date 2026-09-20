import { env } from "cloudflare:workers"

import { type ReactElement } from "react"

import { resend } from "~/src/integrations/resend/resend.config"

import { tryCatch } from "~/src/lib/try-catch"

import { APP_NAME } from "~/src/presentation/branding/app"
export const sendEmail = ({ from, react, subject, to }: Readonly<SendEmailOptions>) =>
  tryCatch(
    resend.emails.send({
      from: from ?? `${APP_NAME} <${env.RESEND_EMAIL_FROM}>`,
      react,
      subject,
      to,
    }),
  )

interface SendEmailOptions {
  readonly from?: string
  readonly react: ReactElement
  readonly subject: string
  readonly to: string
}
