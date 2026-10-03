import { type APIRequestContext } from "@playwright/test"
import { z } from "zod"

import { expect } from "./test"

const sentEmailsSchema = z.array(
  z.object({
    from: z.string(),
    html: z.string(),
    id: z.string(),
    subject: z.string(),
    to: z.array(z.string()),
  }),
)

export type SentEmail = z.infer<typeof sentEmailsSchema>[number]

const sentEmails = async (request: APIRequestContext, recipient: string): Promise<SentEmail[]> => {
  const response = await request.get("/__test/emails", { params: { to: recipient } }).catch(() => undefined)
  if (response === undefined) {
    return []
  }

  expect(response.ok()).toBe(true)

  return sentEmailsSchema.parse(await response.json())
}

export const waitForEmail = async (request: APIRequestContext, recipient: string, subject: string): Promise<SentEmail> => {
  await expect
    .poll(async () => (await sentEmails(request, recipient)).map((email) => email.subject), {
      message: `Waiting for "${subject}" to be sent to ${recipient}`,
    })
    .toContain(subject)
  const email = (await sentEmails(request, recipient)).findLast((sent) => sent.subject === subject)
  if (email === undefined) {
    throw new Error(`No "${subject}" email reached ${recipient}`)
  }

  return email
}

export const linkIn = (email: SentEmail, pattern: RegExp): URL => {
  const href = [...email.html.matchAll(/href="(?<href>[^"]+)"/gu)]
    .map((match) => match.groups?.["href"]?.replaceAll("&amp;", "&") ?? "")
    .find((candidate) => pattern.test(candidate))
  if (href === undefined) {
    throw new Error(`"${email.subject}" holds no link matching ${String(pattern)}`)
  }

  return new URL(href)
}
