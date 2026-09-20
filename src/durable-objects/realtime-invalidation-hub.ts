import { DurableObject } from "cloudflare:workers"

import { type QueryKey } from "@tanstack/react-query"

import {
  REALTIME_INVALIDATION_MESSAGE,
  type RealtimeInvalidationPayload,
  serializeQueryKeyPrefix,
} from "~/src/lib/realtime-invalidation/realtime-invalidation.protocol"
import {
  REALTIME_INVALIDATION_HUB,
  type RealtimeInvalidationHubName,
} from "~/src/lib/realtime-invalidation/realtime-invalidation.subscriptions"
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
const WEBSOCKET_UPGRADE_STATUS = 101
const WEBSOCKET_INTERNAL_ERROR_CODE = 1011
const WEBSOCKET_PAIR_CLIENT_INDEX = 0
const WEBSOCKET_PAIR_SERVER_INDEX = 1

/** One hibernatable hub per audience: admin or storefront. */
export class RealtimeInvalidationHub extends DurableObject<Env> {
  fetch(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", {
        status: 426,
      })
    }
    const hubName = this.ctx.id.name
    if (hubName === undefined) {
      return new Response("Hub name required", {
        status: 400,
      })
    }
    const { client, server } = splitWebSocketPair(new WebSocketPair())
    this.ctx.acceptWebSocket(server, [hubName])
    return new Response(undefined, {
      status: WEBSOCKET_UPGRADE_STATUS,
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
      } catch {
        // A closed socket must not interrupt delivery to the remaining connections.
      }
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
