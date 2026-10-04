import {
  type Domain,
  type DomainDkimRecord,
  type DomainRecords,
  type DomainSpfRecord,
  type ErrorResponse,
  type GetDomainResponseSuccess,
  type ListDomainsResponseSuccess,
  Resend,
} from "resend"

import { APP_DOMAIN, APP_NAME } from "~/src/presentation/branding/app"

export const RESEND_RETRY_DELAY_MS = 1000

export const VERIFY_EMAIL_SENDER_TIMEOUT_MS = 30_000

const parseSender = (from: string): SenderAddress => {
  const domain = BARE_ADDRESS.exec(from)?.groups?.["domain"]
  if (domain === undefined) {
    throw new Error(
      `RESEND_EMAIL_FROM must be a bare address such as noreply@${APP_DOMAIN}, with no display name or spaces, because sendEmail sends as "${APP_NAME} <RESEND_EMAIL_FROM>".`,
    )
  }

  return { address: from, domain: domain.toLowerCase() }
}

const wait = async (milliseconds: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>()
  setTimeout(resolve, milliseconds)
  await promise
}

const request = async <Result extends { readonly error: ErrorResponse | null }>(call: () => Promise<Result>): Promise<Result> => {
  const first = await call()
  if (first.error === null || !TRANSIENT_ERRORS.has(first.error.name)) {
    return first
  }

  await wait(RESEND_RETRY_DELAY_MS)

  return call()
}

const domainListFailure = (keyName: ResendKeyName, { message, name }: ErrorResponse): Error =>
  KEY_ERRORS.has(name)
    ? new Error(`Resend rejected ${keyName} (${name}): ${message}. Check the key and its permission at https://resend.com/api-keys.`)
    : new Error(`Resend could not list the domains of ${keyName} (${name}): ${message}. Run the check again in a moment.`)

const sendTestEmail = async (resend: Resend, address: string): Promise<string> => {
  const { error } = await request(() =>
    resend.emails.send({
      from: `${APP_NAME} <${address}>`,
      subject: `${APP_NAME} sender check`,
      text: "Sent by scripts/verify-email-sender.ts to confirm that Resend accepts this sender before a deploy.",
      to: RESEND_TEST_INBOX,
    }),
  )
  if (error !== null) {
    throw new Error(`Resend refuses to send as ${address}: ${error.message}`)
  }

  return `RESEND_API_KEY may only send, so Resend would not list its domains. Resend accepted a test e-mail from ${address} to ${RESEND_TEST_INBOX} instead. Set RESEND_MANAGEMENT_API_KEY to check the domain's DNS records without sending.`
}

const collectDomains = async ({ client, keyName }: ResendAccount, page: ListDomainsResponseSuccess): Promise<readonly Domain[]> => {
  const last = page.data.at(-1)
  if (!page.has_more || last === undefined) {
    return page.data
  }

  const next = await request(() => client.domains.list({ after: last.id, limit: DOMAIN_PAGE_SIZE }))
  if (next.error !== null) {
    throw domainListFailure(keyName, next.error)
  }

  return [...page.data, ...(await collectDomains({ client, keyName }, next.data))]
}

const isSendingRecord = (record: DomainRecords): record is DomainDkimRecord | DomainSpfRecord =>
  record.record === "DKIM" || record.record === "SPF"

const sendingRecordsVerified = (records: readonly DomainRecords[]): boolean => {
  const sending = records.filter((record) => isSendingRecord(record))

  return (
    sending.some(({ record }) => record === "DKIM") &&
    sending.some(({ record }) => record === "SPF") &&
    sending.every(({ status }) => status === "verified")
  )
}

const describeRecord = ({ name, priority, status, type, value }: DomainDkimRecord | DomainSpfRecord): string =>
  `  ${[type, name, value, priority, status].filter((part) => part !== undefined).join("  ")}`

const unverifiedDomainFailure = ({ name, records, status }: GetDomainResponseSuccess, address: string): Error => {
  const unverified = records.filter((record) => isSendingRecord(record)).filter((record) => record.status !== "verified")
  const instruction =
    unverified.length > 0
      ? "Publish these DNS records at the domain's DNS provider, then press Verify on https://resend.com/domains:"
      : "Resend does not list both a DKIM and an SPF record for it yet, so open the domain on https://resend.com/domains, publish the records it shows and press Verify."

  return new Error(
    [
      `${name} is ${status} in Resend, so every e-mail from ${address} is refused. ${instruction}`,
      ...unverified.map((record) => describeRecord(record)),
    ].join("\n"),
  )
}

const verifyDomain = async (resend: Resend, domain: Domain, address: string): Promise<string> => {
  if (domain.capabilities.sending !== "enabled") {
    throw new Error(`Sending is disabled for ${domain.name}. Enable it on https://resend.com/domains.`)
  }

  const { data, error } = await request(() => resend.domains.get(domain.id))
  if (error !== null) {
    throw new Error(`Resend could not read the DNS records of ${domain.name}: ${error.message}`)
  }

  if (data.status !== "verified" && !sendingRecordsVerified(data.records)) {
    throw unverifiedDomainFailure(data, address)
  }

  return `Resend can send as ${address}: ${domain.name} is verified for sending.`
}

const verifyListedDomain = async (
  account: ResendAccount,
  firstPage: ListDomainsResponseSuccess,
  { address, domain }: SenderAddress,
): Promise<string> => {
  const domains = await collectDomains(account, firstPage)
  const match = domains.find(({ name }) => name.toLowerCase() === domain)
  if (match === undefined) {
    throw new Error(
      `${domain} is not a domain of this Resend account. Add it on https://resend.com/domains and publish the DNS records Resend lists.`,
    )
  }

  return verifyDomain(account.client, match, address)
}

const verifyWithManagementKey = async (managementApiKey: string, sender: SenderAddress): Promise<string> => {
  const management = new Resend(managementApiKey)
  const firstPage = await request(() => management.domains.list({ limit: DOMAIN_PAGE_SIZE }))
  if (firstPage.error !== null) {
    throw domainListFailure("RESEND_MANAGEMENT_API_KEY", firstPage.error)
  }

  return verifyListedDomain({ client: management, keyName: "RESEND_MANAGEMENT_API_KEY" }, firstPage.data, sender)
}

const checkSender = async ({ apiKey, environment, from, managementApiKey }: Readonly<EmailSenderCheck>): Promise<string> => {
  if (apiKey === undefined || apiKey.trim() === "") {
    throw new Error(`RESEND_API_KEY is missing for ${environment}. Create a key at https://resend.com/api-keys.`)
  }

  if (from === undefined || from.trim() === "") {
    throw new Error(`RESEND_EMAIL_FROM is missing for ${environment}. Set it to a bare address such as noreply@${APP_DOMAIN}.`)
  }

  const sender = parseSender(from)
  if (sender.domain === ONBOARDING_DOMAIN && environment !== "development") {
    throw new Error(
      `${sender.address} only delivers to the owner of the Resend account, so customers would receive nothing. Verify the shop's domain on https://resend.com/domains and send from it.`,
    )
  }

  const resend = new Resend(apiKey)
  const firstPage = await request(() => resend.domains.list({ limit: DOMAIN_PAGE_SIZE }))
  if (firstPage.error !== null && firstPage.error.name !== "restricted_api_key") {
    throw domainListFailure("RESEND_API_KEY", firstPage.error)
  }

  if (sender.domain === ONBOARDING_DOMAIN) {
    return `Resend accepts RESEND_API_KEY. ${sender.address} delivers only to the owner of the Resend account, which is enough for development.`
  }

  if (firstPage.error === null) {
    return verifyListedDomain({ client: resend, keyName: "RESEND_API_KEY" }, firstPage.data, sender)
  }

  return managementApiKey === undefined || managementApiKey.trim() === ""
    ? sendTestEmail(resend, sender.address)
    : verifyWithManagementKey(managementApiKey, sender)
}

export const verifyEmailSender = async (check: Readonly<EmailSenderCheck>): Promise<string> => {
  const timeout = Promise.withResolvers<never>()
  const timer = setTimeout(() => {
    timeout.reject(new Error(`Resend did not answer within ${VERIFY_EMAIL_SENDER_TIMEOUT_MS} ms. Run the check again in a moment.`))
  }, VERIFY_EMAIL_SENDER_TIMEOUT_MS)

  try {
    return await Promise.race([checkSender(check), timeout.promise])
  } finally {
    clearTimeout(timer)
  }
}

interface EmailSenderCheck {
  readonly apiKey: string | undefined
  readonly environment: "development" | "preview" | "production"
  readonly from: string | undefined
  readonly managementApiKey: string | undefined
}

interface ResendAccount {
  readonly client: Resend
  readonly keyName: ResendKeyName
}

interface SenderAddress {
  readonly address: string
  readonly domain: string
}

type ResendKeyName = "RESEND_API_KEY" | "RESEND_MANAGEMENT_API_KEY"

const BARE_ADDRESS = /^[^\s<>@]+@(?<domain>[^\s<>@]+\.[^\s<>@]+)$/u

const DOMAIN_PAGE_SIZE = 100

const KEY_ERRORS: ReadonlySet<string> = new Set(["invalid_api_key", "missing_api_key", "restricted_api_key", "validation_error"])

const ONBOARDING_DOMAIN = "resend.dev"

const RESEND_TEST_INBOX = "delivered@resend.dev"

const TRANSIENT_ERRORS: ReadonlySet<string> = new Set(["application_error", "internal_server_error", "rate_limit_exceeded"])
