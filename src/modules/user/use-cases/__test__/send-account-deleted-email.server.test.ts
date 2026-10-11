import { type ReactElement } from "react"

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type * as Seo from "~/src/lib/seo"

import accountDeletedEnglish from "~/messages/en-US/emails.account-deleted.json"
import accountDeletedPolish from "~/messages/pl-PL/emails.account-deleted.json"

interface SentEmail {
  readonly react: ReactElement<Record<string, unknown>>
  readonly revealsAccountExistence?: boolean
  readonly subject: string
  readonly to: string
}

const stubs = vi.hoisted(() => ({
  buildLocalizedUrl: vi.fn<(base: string, path: string, locale: string) => string>(),
  getCurrentLocale: vi.fn<() => string>(),
  recordEmailFailedAudit: vi.fn<(target: string, options?: { detail?: string }) => void>(),
  sendEmail: vi.fn<(input: SentEmail) => Promise<string | undefined>>(),
}))

vi.mock("cloudflare:workers", () => ({
  env: {
    AUTH_GOOGLE_CLIENT_ID: "test-google-client",
    AUTH_GOOGLE_CLIENT_SECRET: "test-google-secret",
    AUTH_SECRET: "local-test-auth-secret-with-at-least-thirty-two-characters",
  },
}))

vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: stubs.sendEmail }))

vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: stubs.getCurrentLocale }))

vi.mock("~/src/lib/seo", () => ({ buildLocalizedUrl: stubs.buildLocalizedUrl }))

vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordEmailFailedAudit: stubs.recordEmailFailedAudit }))

vi.mock("~/src/presentation/emails/account-deleted", () => ({
  ACCOUNT_DELETED_NAMESPACE: "emails.account-deleted",
  AccountDeleted: () => null,
}))

const { sendAccountDeletedEmail } = await import("~/src/modules/user/use-cases/send-account-deleted-email.server")

const seo = await vi.importActual<typeof Seo>("~/src/lib/seo")

const LOCALE = "pl-PL"

const user = { email: "shopper@marte.test", name: "Ada" }

const goodbye = { email: user.email, name: user.name, origin: "http://127.0.0.1:3000" }

const sentEmail = (): SentEmail | undefined => stubs.sendEmail.mock.calls[0]?.[0]

const sentProp = (name: string): unknown => sentEmail()?.react.props[name]

beforeEach(() => {
  vi.resetAllMocks()
  stubs.getCurrentLocale.mockReturnValue(LOCALE)
  stubs.sendEmail.mockResolvedValue(undefined)
  stubs.buildLocalizedUrl.mockImplementation((_base, path, locale) => (path === "/" ? `/${locale}` : `/${locale}${path}`))
})

describe("account emails", () => {
  it("sends a goodbye note under the locale it is given, linking to the storefront it was sent from", async () => {
    stubs.buildLocalizedUrl.mockImplementation(seo.buildLocalizedUrl)

    await sendAccountDeletedEmail({ ...goodbye, locale: "en-US" })

    expect(sentEmail()?.subject).toBe(accountDeletedEnglish.subject)
    expect(sentProp("storefrontUrl")).toBe("http://127.0.0.1:3000/en-US")
  })

  it("falls back to the request locale for a goodbye note and links a Polish reader to the unprefixed storefront", async () => {
    stubs.buildLocalizedUrl.mockImplementation(seo.buildLocalizedUrl)

    await sendAccountDeletedEmail(goodbye)

    expect(sentEmail()?.subject).toBe(accountDeletedPolish.subject)
    expect(sentProp("storefrontUrl")).toBe("http://127.0.0.1:3000/")
  })
})
