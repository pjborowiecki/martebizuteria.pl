import { type QueryKey } from "@tanstack/react-query"

export const serializeQueryKeyPrefix = (queryKey: QueryKey): string => JSON.stringify(queryKey)

export const parseSerializedQueryKeyPrefix = (serialized: string): QueryKey | undefined => {
  try {
    const parsed: unknown = JSON.parse(serialized)

    return Array.isArray(parsed) ? (parsed as QueryKey) : undefined
  } catch {
    return undefined
  }
}

export const queryKeyPrefixesOverlap = (left: QueryKey, right: QueryKey): boolean => {
  const length = Math.min(left.length, right.length)
  for (let index = 0; index < length; index++) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}

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
