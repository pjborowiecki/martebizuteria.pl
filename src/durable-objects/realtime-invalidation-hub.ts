import type { QueryKey } from "@tanstack/react-query";
import { DurableObject } from "cloudflare:workers";

import {
  REALTIME_INVALIDATION_MESSAGE,
  type RealtimeInvalidationPayload,
  serializeQueryKeyPrefix
} from "~/src/lib/realtime-invalidation/realtime-invalidation.protocol";
import {
  REALTIME_INVALIDATION_HUB,
  type RealtimeInvalidationHubName
} from "~/src/lib/realtime-invalidation/realtime-invalidation.subscriptions";

const WEBSOCKET_UPGRADE_STATUS = 101;
const WEBSOCKET_INTERNAL_ERROR_CODE = 1011;
const WEBSOCKET_PAIR_CLIENT_INDEX = 0;
const WEBSOCKET_PAIR_SERVER_INDEX = 1;

/**
 * Hibernatable WebSocket hub for TanStack Query cache invalidation.
 * One instance per audience (`admin`, `storefront`); push-only, no polling.
 */
export class RealtimeInvalidationHub extends DurableObject<Env> {
  fetch(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const hubName = this.ctx.id.name;
    if (hubName === undefined) {
      return new Response("Hub name required", { status: 400 });
    }

    const { client, server } = splitWebSocketPair(new WebSocketPair());

    this.ctx.acceptWebSocket(server, [hubName]);

    return new Response(undefined, { status: WEBSOCKET_UPGRADE_STATUS, webSocket: client });
  }

  /** RPC: push invalidation topics to every connection in this hub instance. */
  notifyInvalidation(topicPrefixes: readonly string[]): void {
    const emptyTopicCount = 0;
    if (topicPrefixes.length === emptyTopicCount) {
      return;
    }

    const payload = JSON.stringify({
      topics: topicPrefixes,
      type: REALTIME_INVALIDATION_MESSAGE.INVALIDATE
    } satisfies RealtimeInvalidationPayload);

    const hubName = this.ctx.id.name;
    const sockets = resolveHubSockets(this.ctx, hubName);

    for (const socket of sockets) {
      try {
        socket.send(payload);
      } catch {
        // Dead socket — hibernation lifecycle will prune it.
      }
    }
  }

  webSocketClose(ws: WebSocket, code: number, reason: string): void {
    ws.close(code, reason);
  }

  webSocketError(ws: WebSocket): void {
    ws.close(WEBSOCKET_INTERNAL_ERROR_CODE, "WebSocket error");
  }
}

export function toSerializedTopicPrefixes(queryKeys: readonly QueryKey[]): string[] {
  return queryKeys.map((queryKey) => serializeQueryKeyPrefix(queryKey));
}

function isRealtimeInvalidationHubName(name: string | undefined): name is RealtimeInvalidationHubName {
  return name === REALTIME_INVALIDATION_HUB.ADMIN || name === REALTIME_INVALIDATION_HUB.STOREFRONT;
}

function resolveHubSockets(ctx: DurableObjectState, hubName: string | undefined): WebSocket[] {
  if (hubName === undefined || !isRealtimeInvalidationHubName(hubName)) {
    return ctx.getWebSockets();
  }

  return ctx.getWebSockets(hubName);
}

interface WebSocketPairEndpoints {
  readonly [WEBSOCKET_PAIR_CLIENT_INDEX]: WebSocket;
  readonly [WEBSOCKET_PAIR_SERVER_INDEX]: WebSocket;
}

function splitWebSocketPair(pair: WebSocketPairEndpoints): { client: WebSocket; server: WebSocket } {
  return {
    client: pair[WEBSOCKET_PAIR_CLIENT_INDEX],
    server: pair[WEBSOCKET_PAIR_SERVER_INDEX]
  };
}
