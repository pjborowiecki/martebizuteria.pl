import { type ComponentProps } from "react"

import { render } from "react-email"
import { describe, expect, it } from "vite-plus/test"

import englishCopy from "~/messages/en-US/emails.incident-alert.json"
import polishCopy from "~/messages/pl-PL/emails.incident-alert.json"
import { INCIDENT_ALERT_NAMESPACE, type Incident, IncidentAlert, type IncidentKind } from "~/src/presentation/emails/incident-alert"

const webhookIncident: Incident = {
  detail: "evt_1Q2w3E4r: D1_ERROR: database is locked",
  kind: "stripeWebhookFailed",
  reference: "checkout.session.completed",
}

const renderIncidentAlert = (overrides: Partial<ComponentProps<typeof IncidentAlert>> = {}, plainText = true): Promise<string> =>
  render(
    <IncidentAlert environment="production" incident={webhookIncident} locale="en-US" messages={englishCopy} {...overrides} />,
    plainText ? { plainText: true } : { plainText: false },
  )

const KINDS: readonly IncidentKind[] = ["auditQueueFailed", "paidCheckoutWithoutOrder", "stripeWebhookFailed"]

describe("IncidentAlert", () => {
  it("names the namespace the messages are loaded under", () => {
    expect(INCIDENT_ALERT_NAMESPACE).toBe("emails.incident-alert")
  })

  it.each(KINDS)("tells the shop what failed and what it means for a %s incident", async (kind) => {
    const text = await renderIncidentAlert({ incident: { ...webhookIncident, kind } })

    expect(text).toContain(englishCopy[kind].heading.toUpperCase())
    expect(text).toContain(englishCopy[kind].message)
  })

  it("states the reference, the cause and the environment the failure happened in", async () => {
    const text = await renderIncidentAlert()

    expect(text).toContain(`${englishCopy.referenceLabel}\n\ncheckout.session.completed`)
    expect(text).toContain(`${englishCopy.detailLabel}\n\nevt_1Q2w3E4r: D1_ERROR: database is locked`)
    expect(text).toContain(`${englishCopy.environmentLabel}\n\nproduction`)
  })

  it("says that further failures are held back for an hour and where every failure is recorded", async () => {
    await expect(renderIncidentAlert()).resolves.toContain(englishCopy.followUp)
  })

  it("renders Polish copy in a Polish document", async () => {
    const html = await renderIncidentAlert({ locale: "pl-PL", messages: polishCopy }, false)

    expect(html).toContain('lang="pl-PL"')
    expect(html).toContain(polishCopy.stripeWebhookFailed.heading)
    expect(html).toContain(polishCopy.referenceLabel)
    expect(html).toContain(polishCopy.tagline)
  })
})
