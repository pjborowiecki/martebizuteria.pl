import { env } from "cloudflare:workers"

import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail, shopNotificationAddress } from "~/src/integrations/resend/resend.send"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import type incidentAlertMessages from "~/messages/en-US/emails.incident-alert.json"
import { INCIDENT_ALERT_NAMESPACE, type Incident, IncidentAlert } from "~/src/presentation/emails/incident-alert"

export const INCIDENT_ALERT_SECONDS = 3600

export const STRIPE_EVENT_RETRY_SECONDS = 259_200

const incidentKey = ({ kind, reference }: Incident): string => `incident-alert:${env.APP_ENV}:${kind}:${reference}`

const incidentOpenSeconds = ({ kind }: Incident): number =>
  kind === "stripeWebhookFailed" ? STRIPE_EVENT_RETRY_SECONDS : INCIDENT_ALERT_SECONDS

const beginsIncident = async (incident: Incident): Promise<boolean> => {
  const key = incidentKey(incident)
  if ((await env.CACHE.get(key)) !== null) {
    return false
  }

  await env.CACHE.put(key, new Date().toISOString(), { expirationTtl: incidentOpenSeconds(incident) })

  return true
}

const attemptIncidentAlert = async (incident: Incident, recipient: string): Promise<string | undefined> => {
  const locale = I18N.DEFAULT_LOCALE
  const messages = await loadNamespace<typeof incidentAlertMessages>({ locale, namespace: INCIDENT_ALERT_NAMESPACE })

  return sendEmail({
    react: createElement(IncidentAlert, { environment: env.APP_ENV, incident, locale, messages }),
    subject: createTranslator({ locale, messages })(`${incident.kind}.subject`),
    to: recipient,
  })
}

export const sendIncidentAlert = async (incident: Incident): Promise<void> => {
  try {
    if (!(await beginsIncident(incident))) {
      return
    }

    const recipient = await shopNotificationAddress()
    const failure = await attemptIncidentAlert(incident, recipient)
    if (failure !== undefined) {
      console.error(`[Alert] The ${incident.kind} alert to ${recipient} was not sent: ${failure}`)
    }
  } catch (error) {
    console.error(`[Alert] The ${incident.kind} alert could not be sent:`, error)
  }
}
