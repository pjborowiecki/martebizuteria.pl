import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { domainsGet, domainsList, emailsSend, keys } = vi.hoisted(() => ({
  domainsGet: vi.fn(),
  domainsList: vi.fn(),
  emailsSend: vi.fn(),
  keys: [] as string[],
}))

vi.mock("resend", () => ({
  Resend: class {
    public readonly domains = { get: domainsGet, list: domainsList }
    public readonly emails = { send: emailsSend }
    public constructor(key: string) {
      keys.push(key)
    }
  },
}))

import { RESEND_RETRY_DELAY_MS, VERIFY_EMAIL_SENDER_TIMEOUT_MS, verifyEmailSender } from "~/src/integrations/resend/resend.sender"

const DOMAIN_NOT_VERIFIED = "The pjborowiecki.com domain is not verified. Please, add and verify your domain on https://resend.com/domains"

const domain = (name: string, sending = "enabled") => ({
  capabilities: { receiving: "disabled", sending },
  created_at: "2026-10-01T00:00:00.000Z",
  id: `dom_${name}`,
  name,
  region: "eu-west-1",
  status: "not_started",
})

const page = (domains: readonly ReturnType<typeof domain>[], hasMore = false) => ({
  data: { data: domains, has_more: hasMore, object: "list" },
  error: null,
  headers: {},
})

const refusal = (name: string, message: string, statusCode: number) => ({ data: null, error: { message, name, statusCode }, headers: {} })

const RESTRICTED_KEY = refusal("restricted_api_key", "This API key is restricted to only send emails", 401)

const RATE_LIMITED = refusal("rate_limit_exceeded", "Too many requests", 429)

const dkimRecord = (status: string) => ({
  name: "resend._domainkey",
  record: "DKIM",
  status,
  ttl: "Auto",
  type: "TXT",
  value: "p=MIGfMA0GCSq",
})

const sendingRecords = (status: string) => [
  dkimRecord(status),
  { name: "send", priority: 10, record: "SPF", status, ttl: "Auto", type: "MX", value: "feedback-smtp.eu-west-1.amazonses.com" },
  { name: "send", record: "SPF", status, ttl: "Auto", type: "TXT", value: "v=spf1 include:amazonses.com ~all" },
]

const details = (status: string, records: readonly object[]) => ({
  data: { ...domain("pjborowiecki.com"), object: "domain", records, status },
  error: null,
  headers: {},
})

const check = (overrides: Partial<Parameters<typeof verifyEmailSender>[0]> = {}) =>
  verifyEmailSender({
    apiKey: "re_test",
    environment: "production",
    from: "hello@pjborowiecki.com",
    managementApiKey: undefined,
    ...overrides,
  })

beforeEach(() => {
  domainsGet.mockReset()
  domainsList.mockReset()
  emailsSend.mockReset()
  keys.length = 0
})

afterEach(() => {
  vi.useRealTimers()
})

describe("verifyEmailSender settings", () => {
  it("refuses to deploy without an API key", async () => {
    await expect(check({ apiKey: undefined })).rejects.toThrow("RESEND_API_KEY is missing for production")
    await expect(check({ apiKey: "  " })).rejects.toThrow("RESEND_API_KEY is missing for production")
    expect(keys).toEqual([])
    expect(domainsList).not.toHaveBeenCalled()
  })

  it("refuses to deploy without a sender", async () => {
    await expect(check({ from: undefined })).rejects.toThrow("RESEND_EMAIL_FROM is missing for production")
    await expect(check({ from: "" })).rejects.toThrow("RESEND_EMAIL_FROM is missing for production")
    expect(domainsList).not.toHaveBeenCalled()
  })

  it("refuses a sender with a display name, with stray spaces, or without a domain", async () => {
    await expect(check({ from: "M'Arte <hello@pjborowiecki.com>" })).rejects.toThrow(
      `RESEND_EMAIL_FROM must be a bare address such as noreply@martebizuteria.pl, with no display name or spaces, because sendEmail sends as "M'Arte <RESEND_EMAIL_FROM>".`,
    )
    await expect(check({ from: "hello@pjborowiecki.com " })).rejects.toThrow("RESEND_EMAIL_FROM must be a bare address")
    await expect(check({ from: "hello@localhost" })).rejects.toThrow("RESEND_EMAIL_FROM must be a bare address")
    expect(domainsList).not.toHaveBeenCalled()
  })

  it("refuses Resend's onboarding sender outside development without calling Resend", async () => {
    await expect(check({ environment: "preview", from: "onboarding@resend.dev" })).rejects.toThrow(
      "onboarding@resend.dev only delivers to the owner of the Resend account, so customers would receive nothing",
    )
    await expect(check({ from: "onboarding@resend.dev" })).rejects.toThrow("only delivers to the owner of the Resend account")
    expect(domainsList).not.toHaveBeenCalled()
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it("accepts Resend's onboarding sender in development once Resend accepts the key", async () => {
    domainsList.mockResolvedValueOnce(page([])).mockResolvedValueOnce(RESTRICTED_KEY)

    await expect(check({ environment: "development", from: "onboarding@resend.dev" })).resolves.toBe(
      "Resend accepts RESEND_API_KEY. onboarding@resend.dev delivers only to the owner of the Resend account, which is enough for development.",
    )
    await expect(check({ environment: "development", from: "onboarding@resend.dev" })).resolves.toContain("Resend accepts RESEND_API_KEY")
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it("refuses Resend's onboarding sender in development when Resend rejects the key", async () => {
    domainsList.mockResolvedValueOnce(refusal("validation_error", "API key is invalid", 400))

    await expect(check({ environment: "development", from: "onboarding@resend.dev" })).rejects.toThrow(
      "Resend rejected RESEND_API_KEY (validation_error): API key is invalid. Check the key and its permission at https://resend.com/api-keys.",
    )
  })
})

describe("verifyEmailSender with a key that can read domains", () => {
  it("passes when the sender's domain is verified for sending", async () => {
    domainsList.mockResolvedValueOnce(page([domain("martebizuteria.pl"), domain("pjborowiecki.com")]))
    domainsGet.mockResolvedValueOnce(details("verified", sendingRecords("verified")))

    await expect(check()).resolves.toBe("Resend can send as hello@pjborowiecki.com: pjborowiecki.com is verified for sending.")
    expect(keys).toEqual(["re_test"])
    expect(domainsList).toHaveBeenCalledWith({ limit: 100 })
    expect(domainsGet).toHaveBeenCalledWith("dom_pjborowiecki.com")
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it("lists the DNS records to publish when the domain is not verified", async () => {
    domainsList.mockResolvedValueOnce(page([domain("pjborowiecki.com")]))
    domainsGet.mockResolvedValueOnce(details("not_started", sendingRecords("not_started")))

    const failure = check()

    await expect(failure).rejects.toThrow(
      "pjborowiecki.com is not_started in Resend, so every e-mail from hello@pjborowiecki.com is refused. Publish these DNS records",
    )
    await expect(failure).rejects.toThrow("TXT  resend._domainkey  p=MIGfMA0GCSq  not_started")
    await expect(failure).rejects.toThrow("MX  send  feedback-smtp.eu-west-1.amazonses.com  10  not_started")
    await expect(failure).rejects.toThrow("TXT  send  v=spf1 include:amazonses.com ~all  not_started")
  })

  it("ignores receiving and tracking records once the sending records are verified", async () => {
    domainsList.mockResolvedValueOnce(page([domain("pjborowiecki.com")]))
    domainsGet.mockResolvedValueOnce(
      details("partially_verified", [
        ...sendingRecords("verified"),
        {
          name: "@",
          priority: 10,
          record: "Receiving",
          status: "pending",
          ttl: "Auto",
          type: "MX",
          value: "inbound-smtp.eu-west-1.amazonaws.com",
        },
      ]),
    )

    await expect(check()).resolves.toContain("is verified for sending")
  })

  it("trusts a domain Resend reports as verified, whatever the status of its records", async () => {
    domainsList.mockResolvedValueOnce(page([domain("pjborowiecki.com")]))
    domainsGet.mockResolvedValueOnce(details("verified", sendingRecords("temporary_failure")))

    await expect(check()).resolves.toContain("is verified for sending")
  })

  it("refuses a domain that is not verified when Resend lists no sending records for it", async () => {
    domainsList.mockResolvedValue(page([domain("pjborowiecki.com")]))
    domainsGet.mockResolvedValueOnce(details("not_started", [])).mockResolvedValueOnce(details("pending", [dkimRecord("verified")]))

    await expect(check()).rejects.toThrow(
      "pjborowiecki.com is not_started in Resend, so every e-mail from hello@pjborowiecki.com is refused. Resend does not list both a DKIM and an SPF record for it yet",
    )
    await expect(check()).rejects.toThrow("pjborowiecki.com is pending in Resend")
  })

  it("matches the sender's domain whatever its case, but never a parent domain", async () => {
    domainsList.mockResolvedValue(page([domain("pjborowiecki.com")]))
    domainsGet.mockResolvedValue(details("verified", sendingRecords("verified")))

    await expect(check({ from: "hello@PJBorowiecki.com" })).resolves.toContain("is verified for sending")
    await expect(check({ from: "hello@mail.pjborowiecki.com" })).rejects.toThrow(
      "mail.pjborowiecki.com is not a domain of this Resend account",
    )
  })

  it("fails when the domain is not in the account", async () => {
    domainsList.mockResolvedValueOnce(page([domain("martebizuteria.pl")]))

    await expect(check()).rejects.toThrow("pjborowiecki.com is not a domain of this Resend account")
    expect(domainsGet).not.toHaveBeenCalled()
  })

  it("fails when sending is disabled for the domain", async () => {
    domainsList.mockResolvedValueOnce(page([domain("pjborowiecki.com", "disabled")]))

    await expect(check()).rejects.toThrow("Sending is disabled for pjborowiecki.com")
    expect(domainsGet).not.toHaveBeenCalled()
  })

  it("pages through every domain of the account", async () => {
    domainsList.mockResolvedValueOnce(page([domain("a.example")], true)).mockResolvedValueOnce(page([domain("pjborowiecki.com")]))
    domainsGet.mockResolvedValueOnce(details("verified", sendingRecords("verified")))

    await expect(check()).resolves.toContain("is verified for sending")
    expect(domainsList).toHaveBeenLastCalledWith({ after: "dom_a.example", limit: 100 })
  })

  it("stops paging when Resend reports more domains but sends none", async () => {
    domainsList.mockResolvedValueOnce(page([], true))

    await expect(check()).rejects.toThrow("is not a domain of this Resend account")
    expect(domainsList).toHaveBeenCalledOnce()
  })
})

describe("verifyEmailSender when Resend errs or stalls", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it("asks again once after a rate limit or an outage", async () => {
    domainsList
      .mockResolvedValueOnce(refusal("application_error", "Internal server error", 500))
      .mockResolvedValueOnce(page([domain("pjborowiecki.com")]))
    domainsGet.mockResolvedValueOnce(RATE_LIMITED).mockResolvedValueOnce(details("verified", sendingRecords("verified")))

    const verifying = check()
    await vi.advanceTimersByTimeAsync(2 * RESEND_RETRY_DELAY_MS)

    await expect(verifying).resolves.toContain("is verified for sending")
    expect(domainsList).toHaveBeenCalledTimes(2)
    expect(domainsGet).toHaveBeenCalledTimes(2)
  })

  it("surfaces Resend's reason without blaming the key when a later page keeps failing", async () => {
    domainsList.mockResolvedValueOnce(page([domain("a.example")], true)).mockResolvedValue(RATE_LIMITED)

    const failure = expect(check()).rejects.toThrow(
      "Resend could not list the domains of RESEND_API_KEY (rate_limit_exceeded): Too many requests. Run the check again in a moment.",
    )
    await vi.advanceTimersByTimeAsync(RESEND_RETRY_DELAY_MS)

    await failure
    expect(domainsList).toHaveBeenCalledTimes(3)
  })

  it("surfaces Resend's reason when it rejects the key, without asking again", async () => {
    domainsList.mockResolvedValueOnce(refusal("validation_error", "API key is invalid", 400))

    await expect(check()).rejects.toThrow("Resend rejected RESEND_API_KEY (validation_error): API key is invalid")
    expect(domainsList).toHaveBeenCalledOnce()
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it("surfaces Resend's reason when it keeps failing to read the domain's records", async () => {
    domainsList.mockResolvedValueOnce(page([domain("pjborowiecki.com")]))
    domainsGet.mockResolvedValue(RATE_LIMITED)

    const failure = expect(check()).rejects.toThrow("Resend could not read the DNS records of pjborowiecki.com: Too many requests")
    await vi.advanceTimersByTimeAsync(RESEND_RETRY_DELAY_MS)

    await failure
  })

  it("gives up when Resend does not answer in time", async () => {
    domainsList.mockReturnValueOnce(Promise.withResolvers().promise)

    const failure = expect(check()).rejects.toThrow("Resend did not answer within 30000 ms. Run the check again in a moment.")
    await vi.advanceTimersByTimeAsync(VERIFY_EMAIL_SENDER_TIMEOUT_MS)

    await failure
  })

  it("leaves no timer behind once Resend has answered", async () => {
    domainsList.mockResolvedValueOnce(page([domain("pjborowiecki.com")]))
    domainsGet.mockResolvedValueOnce(details("verified", sendingRecords("verified")))

    await check()

    expect(vi.getTimerCount()).toBe(0)
  })
})

describe("verifyEmailSender with a key that may only send", () => {
  it("passes once Resend accepts a test e-mail to its test inbox", async () => {
    domainsList.mockResolvedValueOnce(RESTRICTED_KEY)
    emailsSend.mockResolvedValueOnce({ data: { id: "email_1" }, error: null, headers: {} })

    await expect(check({ managementApiKey: "  " })).resolves.toBe(
      "RESEND_API_KEY may only send, so Resend would not list its domains. Resend accepted a test e-mail from hello@pjborowiecki.com to delivered@resend.dev instead. Set RESEND_MANAGEMENT_API_KEY to check the domain's DNS records without sending.",
    )
    expect(emailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: "M'Arte <hello@pjborowiecki.com>", subject: "M'Arte sender check", to: "delivered@resend.dev" }),
    )
    expect(domainsGet).not.toHaveBeenCalled()
  })

  it("fails with Resend's refusal when the sender's domain is not verified", async () => {
    domainsList.mockResolvedValueOnce(RESTRICTED_KEY)
    emailsSend.mockResolvedValueOnce(refusal("validation_error", DOMAIN_NOT_VERIFIED, 403))

    await expect(check()).rejects.toThrow(`Resend refuses to send as hello@pjborowiecki.com: ${DOMAIN_NOT_VERIFIED}`)
  })

  it("reads the domain with the management key instead of sending a test e-mail", async () => {
    domainsList.mockResolvedValueOnce(RESTRICTED_KEY).mockResolvedValueOnce(page([domain("pjborowiecki.com")]))
    domainsGet.mockResolvedValueOnce(details("verified", sendingRecords("verified")))

    await expect(check({ managementApiKey: "re_manage" })).resolves.toBe(
      "Resend can send as hello@pjborowiecki.com: pjborowiecki.com is verified for sending.",
    )
    expect(keys).toEqual(["re_test", "re_manage"])
    expect(domainsList).toHaveBeenLastCalledWith({ limit: 100 })
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it("lists the DNS records still to publish through the management key", async () => {
    domainsList.mockResolvedValueOnce(RESTRICTED_KEY).mockResolvedValueOnce(page([domain("pjborowiecki.com")]))
    domainsGet.mockResolvedValueOnce(details("not_started", sendingRecords("not_started")))

    await expect(check({ managementApiKey: "re_manage" })).rejects.toThrow("TXT  resend._domainkey  p=MIGfMA0GCSq  not_started")
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it("names the management key when Resend rejects it", async () => {
    domainsList.mockResolvedValue(RESTRICTED_KEY)

    await expect(check({ managementApiKey: "re_sending_only" })).rejects.toThrow(
      "Resend rejected RESEND_MANAGEMENT_API_KEY (restricted_api_key): This API key is restricted to only send emails.",
    )
    expect(emailsSend).not.toHaveBeenCalled()
  })
})
