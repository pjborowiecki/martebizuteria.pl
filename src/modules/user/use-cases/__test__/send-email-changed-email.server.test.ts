import { type ReactElement } from "react"

import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_STORED_SELLER_DETAILS } from "~/src/platform/testing/mocks/seller-details"

import englishCopy from "~/messages/en-US/emails.email-changed.json"
import polishCopy from "~/messages/pl-PL/emails.email-changed.json"

const stubs = vi.hoisted(() => ({
  getCurrentLocale: vi.fn<() => string>(),
  readSellerDetails: vi.fn<() => Promise<unknown>>(),
  recordEmailFailedAudit: vi.fn(),
  recordEmailSentAudit: vi.fn(),
  sendEmail: vi.fn<(email: { react: ReactElement<Record<string, unknown>>; subject: string; to: string }) => Promise<string | undefined>>(),
}))

vi.mock("~/src/integrations/resend/resend.send", () => ({ sendEmail: stubs.sendEmail }))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: stubs.getCurrentLocale }))
vi.mock("~/src/modules/store-setting/store-setting.accessors", () => ({ readSellerDetails: stubs.readSellerDetails }))
vi.mock("~/src/modules/audit-log/use-cases/record-email-audit.server", () => ({
  recordEmailFailedAudit: stubs.recordEmailFailedAudit,
  recordEmailSentAudit: stubs.recordEmailSentAudit,
}))

const { sendEmailChangedEmail } = await import("~/src/modules/user/use-cases/send-email-changed-email.server")

const NOTICE = { email: "ada@new.example", name: "Ada", previousEmail: "ada@old.example", userId: "user-7" }

const AUDITED = { metadata: { emailKind: "email-changed" }, resourceId: "user-7" }

beforeEach(() => {
  vi.clearAllMocks()
  stubs.getCurrentLocale.mockReturnValue("en-US")
  stubs.readSellerDetails.mockResolvedValue(TEST_STORED_SELLER_DETAILS)
  stubs.sendEmail.mockResolvedValue(undefined)
})

describe("sendEmailChangedEmail", () => {
  it("writes to the old address in the visitor's language, naming the new address only in part", async () => {
    stubs.getCurrentLocale.mockReturnValue("pl-PL")

    await expect(sendEmailChangedEmail(NOTICE)).resolves.toBe(true)

    const sent = stubs.sendEmail.mock.lastCall?.[0]
    expect(sent).toMatchObject({ subject: polishCopy.subject, to: "ada@old.example" })
    expect(sent?.react.props).toMatchObject({
      locale: "pl-PL",
      maskedEmail: "a***@n***.example",
      name: "Ada",
      seller: TEST_STORED_SELLER_DETAILS,
    })
  })

  it("records the notice it sent against the account", async () => {
    await sendEmailChangedEmail(NOTICE)

    expect(stubs.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ subject: englishCopy.subject }))
    expect(stubs.recordEmailSentAudit).toHaveBeenCalledExactlyOnceWith("ada@old.example", AUDITED)
    expect(stubs.recordEmailFailedAudit).not.toHaveBeenCalled()
  })

  it("records why the notice could not be sent, whether Resend refused it or it could not be written", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    stubs.readSellerDetails.mockRejectedValueOnce(new Error("No store settings"))
    stubs.sendEmail.mockResolvedValueOnce("Resend refused")

    await expect(sendEmailChangedEmail(NOTICE)).resolves.toBe(false)
    await expect(sendEmailChangedEmail(NOTICE)).resolves.toBe(false)

    expect(stubs.recordEmailFailedAudit.mock.calls).toStrictEqual([
      ["ada@old.example", { ...AUDITED, detail: "Error: No store settings" }],
      ["ada@old.example", { ...AUDITED, detail: "Resend refused" }],
    ])
    expect(stubs.recordEmailSentAudit).not.toHaveBeenCalled()
  })
})
