import { hasAdminAccess } from "~/src/integrations/better-auth/auth.access"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import {
  REALTIME_INVALIDATION_HUB,
  type RealtimeInvalidationHubName,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

const assertAdminWebSocket = async (request: Request): Promise<Response | undefined> => {
  const session = await getRequestSession(request)
  if (!hasAdminAccess(session?.user.role)) {
    return new Response("Unauthorized", {
      status: HTTP_STATUS.UNAUTHORIZED,
    })
  }

  return undefined
}

export const handleRealtimeInvalidationWebSocket = async (
  request: Request,
  env: Env,
  hubName: RealtimeInvalidationHubName,
): Promise<Response> => {
  if (request.headers.get("Upgrade") !== "websocket") {
    return new Response("Expected WebSocket", {
      status: HTTP_STATUS.UPGRADE_REQUIRED,
    })
  }

  if (hubName === REALTIME_INVALIDATION_HUB.ADMIN) {
    const unauthorized = await assertAdminWebSocket(request)
    if (unauthorized !== undefined) {
      return unauthorized
    }
  }

  const hub = env.REALTIME_INVALIDATION_HUB.getByName(hubName)

  return hub.fetch(request)
}
