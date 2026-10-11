import { type ComponentProps, type ReactElement } from "react"

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import polishCopy from "~/messages/pl-PL/emails.incident-alert.json"
import { type Incident, type IncidentAlert } from "~/src/presentation/emails/incident-alert"

type IncidentAlertElement = ReactElement<ComponentProps<typeof IncidentAlert>>

const { cacheGet, cachePut, env, loadNamespace, sendEmail } = vi.hoisted(() => {
  const get = vi.fn<(key: string) => Promise<string | null>>()
  const put = vi.fn<(key: string, value: string, options: { readonly expirationTtl: number }) => Promise<void>>()

  return {
    cacheGet: get,
    cachePut: put,
    env: { APP_ENV: "production", CACHE: { get, put }, RESEND_EMAIL_FROM: "alerts@marte.test" },
    loadNamespace: vi.fn(),
    sendEmail:
      vi.fn<
        (options: { readonly react: IncidentAlertElement; readonly subject: string; readonly to: string }) => Promise<string | undefined>
      >(),
  }
})

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail }))
vi.mock("~/src/integrations/use-intl/i18n.messages", () => ({ loadNamespace }))

import { INCIDENT_ALERT_SECONDS, STRIPE_EVENT_RETRY_SECONDS, sendIncidentAlert } from "~/src/lib/incident-alert.server"

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

const incident: Incident = {
  detail: "checkout.session.completed: D1_ERROR: database is locked",
  kind: "stripeWebhookFailed",
  reference: "evt_1Q2w3E4r",
}

const INCIDENT_KEY = "incident-alert:production:stripeWebhookFailed:evt_1Q2w3E4r"

const sentEmail = () => {
  const [call] = sendEmail.mock.calls
  if (call === undefined) {
    throw new Error("no incident alert was sent")
  }

  return call[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  cacheGet.mockResolvedValue(null)
  cachePut.mockResolvedValue(undefined)
  loadNamespace.mockResolvedValue(polishCopy)
  sendEmail.mockResolvedValue(undefined)
})

describe("sendIncidentAlert", () => {
  it("emails the shop's sender address in the shop's language when the failure starts an incident", async () => {
    await sendIncidentAlert(incident)

    expect(loadNamespace).toHaveBeenCalledWith({ locale: "pl-PL", namespace: "emails.incident-alert" })
    expect(sentEmail().to).toBe("alerts@marte.test")
    expect(sentEmail().subject).toBe(polishCopy.stripeWebhookFailed.subject)
    expect(sentEmail().react.props).toStrictEqual({ environment: "production", incident, locale: "pl-PL", messages: polishCopy })
  })

  it("opens a failed Stripe event's incident for the three days Stripe retries it, under its environment, kind and reference, before sending", async () => {
    const steps: string[] = []
    cachePut.mockImplementation(() => {
      steps.push("open")

      return Promise.resolve()
    })
    sendEmail.mockImplementation(() => {
      steps.push("send")

      return Promise.resolve(undefined)
    })

    await sendIncidentAlert(incident)

    expect(cacheGet).toHaveBeenCalledExactlyOnceWith(INCIDENT_KEY)
    expect(cachePut).toHaveBeenCalledExactlyOnceWith(INCIDENT_KEY, expect.any(String), { expirationTtl: STRIPE_EVENT_RETRY_SECONDS })
    expect(STRIPE_EVENT_RETRY_SECONDS).toBe(3 * 24 * 60 * 60)
    expect(steps).toStrictEqual(["open", "send"])
  })

  it("sends nothing more while the same incident is still open", async () => {
    cacheGet.mockResolvedValue("2026-10-10T08:00:00.000Z")

    await sendIncidentAlert(incident)

    expect(cachePut).not.toHaveBeenCalled()
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("keeps an incident of another kind or reference apart", async () => {
    await sendIncidentAlert({ detail: "D1_ERROR: no such table", kind: "auditQueueFailed", reference: "martebizuteria-audit-log" })

    expect(cacheGet).toHaveBeenCalledExactlyOnceWith("incident-alert:production:auditQueueFailed:martebizuteria-audit-log")
    expect(sentEmail().subject).toBe(polishCopy.auditQueueFailed.subject)
  })

  it.each(["auditQueueFailed", "newsletterFailed", "orderEmailFailed", "paidCheckoutWithoutOrder"] as const)(
    "opens a %s incident, which Stripe does not retry, for an hour",
    async (kind) => {
      await sendIncidentAlert({ ...incident, kind, reference: "reference-1" })

      expect(cachePut).toHaveBeenCalledExactlyOnceWith(`incident-alert:production:${kind}:reference-1`, expect.any(String), {
        expirationTtl: INCIDENT_ALERT_SECONDS,
      })
      expect(INCIDENT_ALERT_SECONDS).toBe(3600)
    },
  )

  it("logs an alert Resend refused and resolves", async () => {
    sendEmail.mockResolvedValue("Resend did not answer within 10000 ms")

    await expect(sendIncidentAlert(incident)).resolves.toBeUndefined()

    expect(consoleError).toHaveBeenCalledWith(
      "[Alert] The stripeWebhookFailed alert to alerts@marte.test was not sent: Resend did not answer within 10000 ms",
    )
  })

  it("logs instead of throwing when the incident cannot be read", async () => {
    const unavailable = new Error("KV GET failed: 503 Service Unavailable")
    cacheGet.mockRejectedValue(unavailable)

    await expect(sendIncidentAlert(incident)).resolves.toBeUndefined()

    expect(sendEmail).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith("[Alert] The stripeWebhookFailed alert could not be sent:", unavailable)
  })

  it("logs instead of throwing when the alert cannot be written", async () => {
    loadNamespace.mockRejectedValue(new Error("Missing translation namespace"))

    await expect(sendIncidentAlert(incident)).resolves.toBeUndefined()

    expect(sendEmail).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith("[Alert] The stripeWebhookFailed alert could not be sent:", expect.any(Error))
  })
})
