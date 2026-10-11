import { env } from "cloudflare:workers"

import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import type incidentAlertMessages from "~/messages/en-US/emails.incident-alert.json"
import { INCIDENT_ALERT_NAMESPACE, type Incident, IncidentAlert } from "~/src/presentation/emails/incident-alert"

export const INCIDENT_ALERT_SECONDS = 3600

const incidentKey = ({ kind, reference }: Incident): string => `incident-alert:${env.APP_ENV}:${kind}:${reference}`

const beginsIncident = async (incident: Incident): Promise<boolean> => {
  const key = incidentKey(incident)
  if ((await env.CACHE.get(key)) !== null) {
    return false
  }

  await env.CACHE.put(key, new Date().toISOString(), { expirationTtl: INCIDENT_ALERT_SECONDS })

  return true
}

const sendIncidentAlert = async (incident: Incident): Promise<string | undefined> => {
  const locale = I18N.DEFAULT_LOCALE
  const messages = await loadNamespace<typeof incidentAlertMessages>({ locale, namespace: INCIDENT_ALERT_NAMESPACE })

  return sendEmail({
    react: createElement(IncidentAlert, { environment: env.APP_ENV, incident, locale, messages }),
    subject: createTranslator({ locale, messages })(`${incident.kind}.subject`),
    to: env.RESEND_EMAIL_FROM,
  })
}

export const notifyShopOfIncident = async (incident: Incident): Promise<void> => {
  try {
    if (!(await beginsIncident(incident))) {
      return
    }

    const failure = await sendIncidentAlert(incident)
    if (failure !== undefined) {
      console.error(`[Alert] The ${incident.kind} alert to ${env.RESEND_EMAIL_FROM} was not sent: ${failure}`)
    }
  } catch (error) {
    console.error(`[Alert] The ${incident.kind} alert could not be sent:`, error)
  }
}
