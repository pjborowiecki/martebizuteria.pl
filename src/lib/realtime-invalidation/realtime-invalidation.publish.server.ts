import type { QueryKey } from "@tanstack/react-query";
import { env } from "cloudflare:workers";

import { scheduleBackgroundWork } from "~/src/integrations/better-auth/auth.background";

import {
  REALTIME_INVALIDATION_HUB,
  type RealtimeInvalidationHubName
} from "~/src/lib/realtime-invalidation/realtime-invalidation.subscriptions";

import { toSerializedTopicPrefixes } from "~/src/durable-objects/realtime-invalidation-hub";

interface PublishRealtimeInvalidationInput {
  readonly admin?: readonly QueryKey[];
  readonly storefront?: readonly QueryKey[];
}

const EMPTY_TOPIC_COUNT = 0;

async function publishToHub(hubName: RealtimeInvalidationHubName, queryKeys: readonly QueryKey[]): Promise<void> {
  if (queryKeys.length === EMPTY_TOPIC_COUNT) {
    return;
  }

  const hub = env.REALTIME_INVALIDATION_HUB.getByName(hubName);
  await hub.notifyInvalidation(toSerializedTopicPrefixes(queryKeys));
}

export async function publishRealtimeInvalidation(input: PublishRealtimeInvalidationInput): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (input.admin !== undefined) {
    tasks.push(publishToHub(REALTIME_INVALIDATION_HUB.ADMIN, input.admin));
  }

  if (input.storefront !== undefined) {
    tasks.push(publishToHub(REALTIME_INVALIDATION_HUB.STOREFRONT, input.storefront));
  }

  await Promise.all(tasks);
}

/** Non-blocking invalidation fan-out via Durable Object WebSockets (`waitUntil` when available). */
export function scheduleRealtimeInvalidation(input: PublishRealtimeInvalidationInput): void {
  scheduleBackgroundWork(publishRealtimeInvalidation(input));
}
