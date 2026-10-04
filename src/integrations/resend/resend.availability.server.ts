import { env } from "cloudflare:workers"

export const EMAIL_SENDER_UNAVAILABLE_SECONDS = 300

const unavailableSenderKey = (): string => `email-sender-unavailable:${env.APP_ENV}`

export const isEmailSenderUnavailable = async (): Promise<boolean> => {
  try {
    return (await env.CACHE.get(unavailableSenderKey())) !== null
  } catch (error) {
    console.error("[Resend] Email sender availability unreadable", error)

    return false
  }
}

export const markEmailSenderUnavailable = async (reason: string): Promise<void> => {
  if (await isEmailSenderUnavailable()) {
    return
  }

  await env.CACHE.put(unavailableSenderKey(), reason, { expirationTtl: EMAIL_SENDER_UNAVAILABLE_SECONDS })
}
