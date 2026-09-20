import { env } from "cloudflare:workers"

import { type QueryKey } from "@tanstack/react-query"

import { scheduleBackgroundWork } from "~/src/integrations/better-auth/auth.background"

import {
  REALTIME_INVALIDATION_HUB,
  type RealtimeInvalidationHubName,
} from "~/src/lib/realtime-invalidation/realtime-invalidation.subscriptions"

import { toSerializedTopicPrefixes } from "~/src/durable-objects/realtime-invalidation-hub"
const publishToHub = async (hubName: RealtimeInvalidationHubName, queryKeys: readonly QueryKey[]): Promise<void> => {
  if (queryKeys.length === 0) {
    return
  }
  const hub = env.REALTIME_INVALIDATION_HUB.getByName(hubName)
  await hub.notifyInvalidation(toSerializedTopicPrefixes(queryKeys))
}
export const publishRealtimeInvalidation = async (input: PublishRealtimeInvalidationInput): Promise<void> => {
  const tasks: Promise<void>[] = []
  if (input.admin !== undefined) {
    tasks.push(publishToHub(REALTIME_INVALIDATION_HUB.ADMIN, input.admin))
  }
  if (input.storefront !== undefined) {
    tasks.push(publishToHub(REALTIME_INVALIDATION_HUB.STOREFRONT, input.storefront))
  }
  await Promise.all(tasks)
}

/** Non-blocking invalidation fan-out via Durable Object WebSockets (`waitUntil` when available). */
export const scheduleRealtimeInvalidation = (input: PublishRealtimeInvalidationInput): void => {
  scheduleBackgroundWork(publishRealtimeInvalidation(input))
}
interface PublishRealtimeInvalidationInput {
  readonly admin?: readonly QueryKey[]
  readonly storefront?: readonly QueryKey[]
}
