import { env } from "cloudflare:workers"

import { type ReactElement } from "react"

import { resend } from "~/src/integrations/resend/resend.config"

import { APP_NAME } from "~/src/presentation/branding/app"

export const sendEmail = async ({ from, react, subject, to }: Readonly<SendEmailOptions>): Promise<string | undefined> => {
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

interface SendEmailOptions {
  readonly from?: string
  readonly react: ReactElement
  readonly subject: string
  readonly to: string
}
