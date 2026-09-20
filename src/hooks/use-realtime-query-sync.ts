import { useEffect } from "react"

import { type QueryKey, useQueryClient } from "@tanstack/react-query"

import { syncQueryInvalidation } from "~/src/lib/query-client-sync"
import {
  isRealtimeInvalidationPayload,
  parseSerializedQueryKeyPrefix,
  queryKeyPrefixesOverlap,
} from "~/src/lib/realtime-invalidation/realtime-invalidation.protocol"
import { type RealtimeInvalidationHubName } from "~/src/lib/realtime-invalidation/realtime-invalidation.subscriptions"

import { ROUTES } from "~/src/routes"
const resolveWebSocketPath = (hub: RealtimeInvalidationHubName): string =>
  hub === "admin" ? ROUTES.API_REALTIME.ADMIN_WS : ROUTES.API_REALTIME.STOREFRONT_WS

const buildWebSocketUrl = (hub: RealtimeInvalidationHubName): string => {
  const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:"
  return `${protocol}//${globalThis.location.host}${resolveWebSocketPath(hub)}`
}
const matchingSubscriptionPrefixes = (subscriptions: readonly QueryKey[], invalidatedTopics: readonly string[]): QueryKey[] => {
  const invalidatedPrefixes = invalidatedTopics
    .map((topic) => parseSerializedQueryKeyPrefix(topic))
    .filter((prefix): prefix is QueryKey => prefix !== undefined)
  const matches: QueryKey[] = []
  for (const subscription of subscriptions) {
    const hasOverlap = invalidatedPrefixes.some((invalidated) => queryKeyPrefixesOverlap(subscription, invalidated))
    if (hasOverlap) {
      matches.push(subscription)
    }
  }
  return matches
}

export const useRealtimeQuerySync = ({ hub, subscriptions }: UseRealtimeQuerySyncOptions): void => {
  const queryClient = useQueryClient()
  useEffect(() => {
    let reconnectAttempt = 0
    let disposed = false
    const connection: {
      reconnectTimer: ReturnType<typeof globalThis.setTimeout> | undefined
      socket: WebSocket | undefined
    } = {
      reconnectTimer: undefined,
      socket: undefined,
    }
    const handleMessage = (event: MessageEvent<string>): void => {
      try {
        const data: unknown = JSON.parse(event.data)
        if (!isRealtimeInvalidationPayload(data)) {
          return
        }
        const prefixes = matchingSubscriptionPrefixes(subscriptions, data.topics)
        for (const prefix of prefixes) {
          void syncQueryInvalidation(queryClient, prefix)
        }
      } catch {
        // Ignore malformed hub messages.
      }
    }
    const scheduleReconnect = (): void => {
      if (disposed) {
        return
      }
      const delay = Math.min(BASE_RECONNECT_DELAY_MS * RECONNECT_BACKOFF_FACTOR ** reconnectAttempt, MAX_RECONNECT_DELAY_MS)
      reconnectAttempt += 1
      connection.reconnectTimer = globalThis.setTimeout(connect, delay)
    }
    const connect = (): void => {
      if (disposed) {
        return
      }
      connection.socket = new WebSocket(buildWebSocketUrl(hub))
      connection.socket.addEventListener("message", handleMessage)
      connection.socket.addEventListener("open", () => {
        reconnectAttempt = 0
      })
      connection.socket.addEventListener("close", scheduleReconnect)
    }
    connect()
    return function disconnectFromRealtimeInvalidationHub() {
      disposed = true
      if (connection.reconnectTimer !== undefined) {
        globalThis.clearTimeout(connection.reconnectTimer)
      }
      connection.socket?.close()
    }
  }, [hub, queryClient, subscriptions])
}
const BASE_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30_000
const RECONNECT_BACKOFF_FACTOR = 2
interface UseRealtimeQuerySyncOptions {
  readonly hub: RealtimeInvalidationHubName
  readonly subscriptions: readonly QueryKey[]
}
