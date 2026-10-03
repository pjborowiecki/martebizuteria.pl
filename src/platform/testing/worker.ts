import { completeCheckoutSession, getSentEmails, installProviderMocks, listCheckoutSessions } from "~/src/platform/testing/mocks/providers"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { type AuditLogQueueMessage } from "~/src/modules/audit-log/audit-log.queue.server"

export { RealtimeInvalidationHub } from "~/src/durable-objects/realtime-invalidation-hub"

installProviderMocks()

const applicationModule = import("~/src/server")

const COMPLETE_SESSION_PATTERN = /^\/__test\/stripe\/checkout-sessions\/(?<sessionId>cs_[\w-]+)\/complete$/u

const loadApplication = async () => {
  const { default: application } = await applicationModule

  return application
}

const requiredParam = (url: URL, name: string): string | undefined => {
  const value = url.searchParams.get(name)

  return value === null || value === "" ? undefined : value
}

const signCompletedCheckout = async (sessionId: string, webhookSecret: string): Promise<Response> => {
  const payload = completeCheckoutSession(sessionId)
  if (payload === undefined) {
    return Response.json({ error: `No checkout session ${sessionId}` }, { status: HTTP_STATUS.NOT_FOUND })
  }

  const { stripe } = await import("~/src/integrations/stripe/stripe.server")
  const signature = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret: webhookSecret })

  return Response.json({ payload, signature })
}

const handleTestRequest = (request: Request, env: Env, url: URL): Promise<Response> | Response | undefined => {
  if (url.pathname === "/__test/emails" && request.method === "GET") {
    const recipient = requiredParam(url, "to")

    return recipient === undefined
      ? Response.json({ error: "An email recipient is required" }, { status: HTTP_STATUS.BAD_REQUEST })
      : Response.json(getSentEmails(recipient))
  }

  if (url.pathname === "/__test/stripe/checkout-sessions" && request.method === "GET") {
    const email = requiredParam(url, "email")

    return email === undefined
      ? Response.json({ error: "A customer email is required" }, { status: HTTP_STATUS.BAD_REQUEST })
      : Response.json(listCheckoutSessions(email))
  }

  const sessionId = COMPLETE_SESSION_PATTERN.exec(url.pathname)?.groups?.["sessionId"]

  return sessionId === undefined || request.method !== "POST" ? undefined : signCompletedCheckout(sessionId, env.STRIPE_WEBHOOK_SECRET)
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const testResponse = url.pathname.startsWith("/__test/") ? await handleTestRequest(request, env, url) : undefined
    if (testResponse !== undefined) {
      return testResponse
    }

    const application = await loadApplication()
    if (application.fetch === undefined) {
      throw new Error("The application registered no fetch handler")
    }

    return application.fetch(request, env, ctx)
  },
  async queue(batch, env, ctx) {
    const application = await loadApplication()
    if (application.queue === undefined) {
      throw new Error("The application registered no queue consumer")
    }

    await application.queue(batch, env, ctx)
  },
} satisfies ExportedHandler<Env, AuditLogQueueMessage>
