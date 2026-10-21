import { env } from "cloudflare:workers"

import { type QueryKey } from "@tanstack/react-query"

import {
  REALTIME_INVALIDATION_HUB,
  type RealtimeInvalidationHubName,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { scheduleBackgroundWork } from "~/src/lib/background"

import { toSerializedTopicPrefixes } from "~/src/durable-objects/realtime-invalidation-hub"

const NOTIFY_ATTEMPTS = 3

const NOTIFY_BACKOFF_MS = 50

const pause = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const notifyHub = async (hubName: RealtimeInvalidationHubName, topicPrefixes: readonly string[], attempt: number): Promise<void> => {
  try {
    const hub = env.REALTIME_INVALIDATION_HUB.getByName(hubName)
    await hub.notifyInvalidation(topicPrefixes)
  } catch (error) {
    if (attempt >= NOTIFY_ATTEMPTS) {
      throw error
    }

    await pause(NOTIFY_BACKOFF_MS * attempt)
    await notifyHub(hubName, topicPrefixes, attempt + 1)
  }
}

const publishToHub = async (hubName: RealtimeInvalidationHubName, queryKeys: readonly QueryKey[]): Promise<void> => {
  if (queryKeys.length === 0) {
    return
  }

  const topicPrefixes = toSerializedTopicPrefixes(queryKeys)
  await notifyHub(hubName, topicPrefixes, 1)
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

export const scheduleRealtimeInvalidation = (input: PublishRealtimeInvalidationInput): void => {
  scheduleBackgroundWork(publishRealtimeInvalidation(input))
}

interface PublishRealtimeInvalidationInput {
  readonly admin?: readonly QueryKey[]
  readonly storefront?: readonly QueryKey[]
}
