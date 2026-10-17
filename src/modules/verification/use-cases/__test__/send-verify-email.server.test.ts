import { type ReactElement } from "react"

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import verifyEmailPolish from "~/messages/pl-PL/emails.verify-email.json"

interface SentEmail {
  readonly react: ReactElement<Record<string, unknown>>
  readonly revealsAccountExistence?: boolean
  readonly subject: string
  readonly to: string
}

const stubs = vi.hoisted(() => ({
  admitPublicEmail: vi.fn<(email: { kind: string; to: string }) => Promise<boolean>>(),
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

vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: {},
}))

vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: stubs.sendEmail }))

vi.mock(import("~/src/integrations/resend/resend.public-email-limits.server"), async (importOriginal) => ({
  ...(await importOriginal()),
  admitPublicEmail: stubs.admitPublicEmail,
}))

vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: stubs.getCurrentLocale }))

vi.mock("~/src/lib/seo", () => ({ buildLocalizedUrl: stubs.buildLocalizedUrl }))

vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({ recordEmailFailedAudit: stubs.recordEmailFailedAudit }))

vi.mock("~/src/presentation/emails/verify-email", () => ({
  VERIFY_EMAIL_NAMESPACE: "emails.verify-email",
  VerifyEmail: () => null,
}))

const { sendVerifyEmail } = await import("~/src/modules/verification/use-cases/send-verify-email.server")

const LOCALE = "pl-PL"

const STOREFRONT_HOME = `/${LOCALE}`

const ACCOUNT_CALLBACK = `/${LOCALE}/account/overview?verified=true`

const user = { email: "shopper@marte.test", id: "user-ada", name: "Ada" }

const verifyUrl = (callback?: string): string =>
  callback === undefined
    ? "https://marte.test/api/auth/verify-email?token=tok"
    : `https://marte.test/api/auth/verify-email?token=tok&callbackURL=${encodeURIComponent(callback)}`

const sentEmail = (): SentEmail | undefined => stubs.sendEmail.mock.calls[0]?.[0]

const sentProp = (name: string): unknown => sentEmail()?.react.props[name]

beforeEach(() => {
  vi.resetAllMocks()
  stubs.getCurrentLocale.mockReturnValue(LOCALE)
  stubs.sendEmail.mockResolvedValue(undefined)
  stubs.admitPublicEmail.mockResolvedValue(true)
  stubs.buildLocalizedUrl.mockImplementation((_base, path, locale) => (path === "/" ? `/${locale}` : `/${locale}${path}`))
})

describe("verification email", () => {
  it.each([["/"], [STOREFRONT_HOME], [`${STOREFRONT_HOME}?promo=1`]])(
    "steers the storefront callback %s to the account overview",
    async (callback) => {
      await sendVerifyEmail({ url: verifyUrl(callback), user })

      expect(sentProp("verificationUrl")).toBe(verifyUrl(ACCOUNT_CALLBACK))
    },
  )

  it("leaves a callback that already points somewhere else alone", async () => {
    const url = verifyUrl("/pl-PL/account/orders")

    await sendVerifyEmail({ url, user })

    expect(sentProp("verificationUrl")).toBe(url)
  })

  it("leaves a link without a callback alone", async () => {
    await sendVerifyEmail({ url: verifyUrl(), user })

    expect(sentProp("verificationUrl")).toBe(verifyUrl())
  })

  it("leaves a link it cannot parse alone", async () => {
    await sendVerifyEmail({ url: "not-a-url", user })

    expect(sentProp("verificationUrl")).toBe("not-a-url")
  })

  it("sends under the localized verification subject", async () => {
    await sendVerifyEmail({ url: verifyUrl(), user })

    expect(sentEmail()?.subject).toBe(verifyEmailPolish.subject)
  })

  it("counts the email against the verification emails the address may receive", async () => {
    await sendVerifyEmail({ url: verifyUrl(), user })

    expect(stubs.admitPublicEmail).toHaveBeenCalledExactlyOnceWith({ kind: "verification", to: user.email, userId: user.id })
  })

  it("sends nothing, and answers as if it had, once the limits refuse the email", async () => {
    stubs.admitPublicEmail.mockResolvedValue(false)

    await expect(sendVerifyEmail({ url: verifyUrl(), user })).resolves.toBeUndefined()

    expect(stubs.sendEmail).not.toHaveBeenCalled()
  })
})
