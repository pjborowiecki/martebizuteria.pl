import { DurableObject } from "cloudflare:workers"

import { type QueryKey } from "@tanstack/react-query"

import {
  REALTIME_INVALIDATION_MESSAGE,
  type RealtimeInvalidationPayload,
  serializeQueryKeyPrefix,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.protocol"
import {
  REALTIME_INVALIDATION_HUB,
  type RealtimeInvalidationHubName,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

export const toSerializedTopicPrefixes = (queryKeys: readonly QueryKey[]): string[] =>
  queryKeys.map((queryKey) => serializeQueryKeyPrefix(queryKey))

const isRealtimeInvalidationHubName = (name: string | undefined): name is RealtimeInvalidationHubName =>
  name === REALTIME_INVALIDATION_HUB.ADMIN || name === REALTIME_INVALIDATION_HUB.STOREFRONT

const resolveHubSockets = (ctx: DurableObjectState, hubName: string | undefined): WebSocket[] => {
  if (hubName === undefined || !isRealtimeInvalidationHubName(hubName)) {
    return ctx.getWebSockets()
  }

  return ctx.getWebSockets(hubName)
}

const splitWebSocketPair = (
  pair: WebSocketPairEndpoints,
): {
  client: WebSocket
  server: WebSocket
} => ({
  client: pair[WEBSOCKET_PAIR_CLIENT_INDEX],
  server: pair[WEBSOCKET_PAIR_SERVER_INDEX],
})

const WEBSOCKET_INTERNAL_ERROR_CODE = 1011

const WEBSOCKET_PAIR_CLIENT_INDEX = 0

const WEBSOCKET_PAIR_SERVER_INDEX = 1

export class RealtimeInvalidationHub extends DurableObject<Env> {
  fetch(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", {
        status: HTTP_STATUS.UPGRADE_REQUIRED,
      })
    }

    const hubName = this.ctx.id.name
    if (hubName === undefined) {
      return new Response("Hub name required", {
        status: HTTP_STATUS.BAD_REQUEST,
      })
    }

    const { client, server } = splitWebSocketPair(new WebSocketPair())
    this.ctx.acceptWebSocket(server, [hubName])

    return new Response(undefined, {
      status: HTTP_STATUS.SWITCHING_PROTOCOLS,
      webSocket: client,
    })
  }
  notifyInvalidation(topicPrefixes: readonly string[]): void {
    const emptyTopicCount = 0
    if (topicPrefixes.length === emptyTopicCount) {
      return
    }

    const payload = JSON.stringify({
      topics: topicPrefixes,
      type: REALTIME_INVALIDATION_MESSAGE.INVALIDATE,
    } satisfies RealtimeInvalidationPayload)

    const hubName = this.ctx.id.name
    const sockets = resolveHubSockets(this.ctx, hubName)
    for (const socket of sockets) {
      try {
        socket.send(payload)
      } catch {}
    }
  }
  webSocketClose(ws: WebSocket, code: number, reason: string): void {
    ws.close(code, reason)
  }
  webSocketError(ws: WebSocket): void {
    ws.close(WEBSOCKET_INTERNAL_ERROR_CODE, "WebSocket error")
  }
}

interface WebSocketPairEndpoints {
  readonly [WEBSOCKET_PAIR_CLIENT_INDEX]: WebSocket
  readonly [WEBSOCKET_PAIR_SERVER_INDEX]: WebSocket
}
