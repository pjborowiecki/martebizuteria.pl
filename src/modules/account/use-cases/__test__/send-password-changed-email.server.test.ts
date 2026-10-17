import { type ReactElement } from "react"

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

import type * as Seo from "~/src/lib/seo"

import passwordChangedPolish from "~/messages/pl-PL/emails.password-changed.json"

interface SentEmail {
  readonly react: ReactElement<Record<string, unknown>>
  readonly revealsAccountExistence?: boolean
  readonly subject: string
  readonly to: string
}

const stubs = vi.hoisted(() => ({
  buildLocalizedUrl: vi.fn<(base: string, path: string, locale: string) => string>(),
  getCurrentLocale: vi.fn<() => string>(),
  recordEmailFailedAudit: vi.fn<(target: string, options?: { detail?: string; metadata?: Record<string, unknown> }) => void>(),
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

vi.mock("~/src/presentation/emails/password-changed", () => ({
  PASSWORD_CHANGED_NAMESPACE: "emails.password-changed",
  PasswordChanged: () => null,
}))

const { sendPasswordChangedEmail } = await import("~/src/modules/account/use-cases/send-password-changed-email.server")

const seo = await vi.importActual<typeof Seo>("~/src/lib/seo")

const LOCALE = "pl-PL"

const user = { email: "shopper@marte.test", id: "user-ada", name: "Ada" }

const resetOn = (origin: string): Request => new Request(`${origin}/api/auth/reset-password`, { method: "POST" })

const sentEmail = (): SentEmail | undefined => stubs.sendEmail.mock.calls[0]?.[0]

const sentProp = (name: string): unknown => sentEmail()?.react.props[name]

beforeEach(() => {
  vi.resetAllMocks()
  stubs.getCurrentLocale.mockReturnValue(LOCALE)
  stubs.sendEmail.mockResolvedValue(undefined)
  stubs.buildLocalizedUrl.mockImplementation((_base, path, locale) => (path === "/" ? `/${locale}` : `/${locale}${path}`))
})

describe("account emails", () => {
  it("tells the customer the password was changed, linking to sign-in on the address the reset came in on", async () => {
    stubs.buildLocalizedUrl.mockImplementation(seo.buildLocalizedUrl)

    await sendPasswordChangedEmail({ request: resetOn("http://127.0.0.1:3000"), user })

    expect(sentEmail()?.to).toBe(user.email)
    expect(sentEmail()?.subject).toBe(passwordChangedPolish.subject)
    expect(sentProp("name")).toBe(user.name)
    expect(sentProp("signInUrl")).toBe("http://127.0.0.1:3000/auth/sign-in")
  })

  it("records a password-changed email it will not link to a host this build does not serve, and keeps the reset successful", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(
      sendPasswordChangedEmail({ request: resetOn("https://martebizuteria.pl.attacker.example"), user }),
    ).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
    expect(stubs.recordEmailFailedAudit).toHaveBeenCalledWith(user.email, {
      detail: `AppError: ${ERROR_CODES.FORBIDDEN}`,
      metadata: { emailKind: "password-changed" },
      resourceId: user.id,
    })
  })
})
