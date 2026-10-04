import { type QueryKey, hashKey, partialMatchKey } from "@tanstack/react-query"

export const serializeQueryKeyPrefix = (queryKey: QueryKey): string => JSON.stringify(queryKey)

export const parseSerializedQueryKeyPrefix = (serialized: string): QueryKey | undefined => {
  try {
    const parsed: unknown = JSON.parse(serialized)

    return Array.isArray(parsed) ? (parsed as QueryKey) : undefined
  } catch {
    return undefined
  }
}

export const toMinimalQueryKeyPrefixes = (queryKeys: readonly QueryKey[]): QueryKey[] => {
  const distinctQueryKeys = [...new Map(queryKeys.map((queryKey) => [hashKey(queryKey), queryKey])).values()]

  return distinctQueryKeys.filter(
    (queryKey) => !distinctQueryKeys.some((prefix) => prefix !== queryKey && partialMatchKey(queryKey, prefix)),
  )
}

const queryKeysInvalidatedByTopic = (subscriptions: readonly QueryKey[], topic: QueryKey): readonly QueryKey[] =>
  subscriptions.some((subscription) => partialMatchKey(topic, subscription))
    ? [topic]
    : subscriptions.filter((subscription) => partialMatchKey(subscription, topic))

export const resolveInvalidatedQueryKeys = (subscriptions: readonly QueryKey[], topics: readonly string[]): QueryKey[] =>
  toMinimalQueryKeyPrefixes(
    topics
      .map((topic) => parseSerializedQueryKeyPrefix(topic))
      .filter((topic): topic is QueryKey => topic !== undefined)
      .flatMap((topic) => queryKeysInvalidatedByTopic(subscriptions, topic)),
  )

export const isRealtimeInvalidationPayload = (data: unknown): data is RealtimeInvalidationPayload =>
  typeof data === "object" &&
  data !== null &&
  "type" in data &&
  data.type === REALTIME_INVALIDATION_MESSAGE.INVALIDATE &&
  "topics" in data &&
  Array.isArray(data.topics) &&
  data.topics.every((topic) => typeof topic === "string")

export const REALTIME_INVALIDATION_MESSAGE = {
  INVALIDATE: "invalidate",
} as const

export interface RealtimeInvalidationPayload {
  readonly topics: readonly string[]
  readonly type: typeof REALTIME_INVALIDATION_MESSAGE.INVALIDATE
}
