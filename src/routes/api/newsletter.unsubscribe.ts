import { createFileRoute } from "@tanstack/react-router"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter/newsletter.constants"
import { unsubscribeByToken } from "~/src/modules/newsletter/newsletter.unsubscribe.server"
import { newsletterZodSchemas } from "~/src/modules/newsletter/newsletter.zod"

export const Route = createFileRoute("/api/newsletter/unsubscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = newsletterZodSchemas.tokenInput.safeParse({ token: new URL(request.url).searchParams.get("token") })
        if (!input.success) {
          return new Response("Missing or malformed unsubscribe token", { status: HTTP_STATUS.BAD_REQUEST })
        }

        const { result } = await unsubscribeByToken(input.data.token)

        return result === NEWSLETTER_TOKEN_RESULT.INVALID
          ? new Response("Unknown unsubscribe token", { status: HTTP_STATUS.NOT_FOUND })
          : Response.json({ unsubscribed: true })
      },
    },
  },
})
