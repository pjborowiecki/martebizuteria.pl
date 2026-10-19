import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AUDIT_EMAIL_KIND } from "~/src/modules/audit-log/audit-log.constants"
import { recordEmailFailedAudit, recordEmailSentAudit } from "~/src/modules/audit-log/use-cases/record-email-audit.server"
import { readSellerDetails } from "~/src/modules/store-setting/store-setting.accessors"
import { maskEmailAddress } from "~/src/modules/user/user.utils"

import type emailChangedMessages from "~/messages/en-US/emails.email-changed.json"
import { EMAIL_CHANGED_NAMESPACE, EmailChanged } from "~/src/presentation/emails/email-changed"

const deliverEmailChangedEmail = async ({ email, name, previousEmail }: EmailChangedNotice): Promise<string | undefined> => {
  const locale = getCurrentLocale()
  const [messages, seller] = await Promise.all([
    loadNamespace<typeof emailChangedMessages>({ locale, namespace: EMAIL_CHANGED_NAMESPACE }),
    readSellerDetails(),
  ])

  return sendEmail({
    react: createElement(EmailChanged, { locale, maskedEmail: maskEmailAddress(email), messages, name, seller }),
    subject: createTranslator({ locale, messages })("subject"),
    to: previousEmail,
  })
}

export const sendEmailChangedEmail = async (notice: EmailChangedNotice): Promise<boolean> => {
  const audited = { metadata: { emailKind: AUDIT_EMAIL_KIND.EMAIL_CHANGED }, resourceId: notice.userId }
  const failure = await deliverEmailChangedEmail(notice).catch(String)
  if (failure === undefined) {
    recordEmailSentAudit(notice.previousEmail, audited)

    return true
  }

  console.error(`[Auth] Failed to tell ${notice.previousEmail} that the account's email changed: ${failure}`)
  recordEmailFailedAudit(notice.previousEmail, { ...audited, detail: failure })

  return false
}

interface EmailChangedNotice {
  readonly email: string
  readonly name: string
  readonly previousEmail: string
  readonly userId: string
}
