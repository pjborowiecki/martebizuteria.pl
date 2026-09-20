import "@tanstack/react-start/server-only"

import { type Locale } from "~/src/integrations/use-intl/i18n.types"

import enEmails from "~/messages/en/emails.json"
import enAuthEmails from "~/messages/en/pages.auth.email.json"
import plEmails from "~/messages/pl/emails.json"
import plAuthEmails from "~/messages/pl/pages.auth.email.json"

// Email templates render synchronously and never need storefront or admin messages.
const EMAIL_MESSAGES = {
  en: { emails: enEmails, pages: { auth: { email: enAuthEmails } } },
  pl: { emails: plEmails, pages: { auth: { email: plAuthEmails } } },
} as const

export const getEmailMessages = (locale: Locale) => EMAIL_MESSAGES[locale]
