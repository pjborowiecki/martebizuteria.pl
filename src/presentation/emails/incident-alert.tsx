import { type JSX } from "react"

import { Heading, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.incident-alert.json"
import { EMAIL_MUTED_TEXT_CLASS, EmailBodyText, EmailBorderedSection, EmailDetailRow } from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const INCIDENT_ALERT_NAMESPACE = "emails.incident-alert"

export const IncidentAlert = ({ environment, incident, locale, messages }: Readonly<IncidentAlertProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "incident-alert": messages } }, namespace: INCIDENT_ALERT_NAMESPACE })

  return (
    <EmailLayout locale={locale} preview={t("preview")} tagline={t("tagline")}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t(`${incident.kind}.heading`)}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t(`${incident.kind}.message`)}</EmailBodyText>

      <EmailBorderedSection>
        <EmailDetailRow isFirst label={t("referenceLabel")}>
          {incident.reference}
        </EmailDetailRow>
        <EmailDetailRow label={t("detailLabel")}>{incident.detail}</EmailDetailRow>
        <EmailDetailRow label={t("environmentLabel")}>{environment}</EmailDetailRow>
      </EmailBorderedSection>

      <Text className={`${EMAIL_MUTED_TEXT_CLASS} mt-[28px]`}>{t("followUp")}</Text>
    </EmailLayout>
  )
}

export type IncidentKind = "auditQueueFailed" | "newsletterFailed" | "orderEmailFailed" | "paidCheckoutWithoutOrder" | "stripeWebhookFailed"

export interface Incident {
  readonly detail: string
  readonly kind: IncidentKind
  readonly reference: string
}

interface IncidentAlertProps {
  readonly environment: string
  readonly incident: Incident
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
}
