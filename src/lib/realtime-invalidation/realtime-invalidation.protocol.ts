import type { QueryKey } from "@tanstack/react-query";

export const REALTIME_INVALIDATION_MESSAGE = {
  INVALIDATE: "invalidate"
} as const;

export interface RealtimeInvalidationPayload {
  readonly topics: readonly string[];
  readonly type: typeof REALTIME_INVALIDATION_MESSAGE.INVALIDATE;
}

export function serializeQueryKeyPrefix(queryKey: QueryKey): string {
  return JSON.stringify(queryKey);
}

export function parseSerializedQueryKeyPrefix(serialized: string): QueryKey | undefined {
  try {
    const parsed: unknown = JSON.parse(serialized);
    return Array.isArray(parsed) ? (parsed as QueryKey) : undefined;
  } catch {
    return undefined;
  }
}

const QUERY_KEY_INDEX_STEP = 1;
const QUERY_KEY_START_INDEX = 0;

/** True when either key is a prefix of the other (TanStack prefix invalidation semantics). */
export function queryKeyPrefixesOverlap(left: QueryKey, right: QueryKey): boolean {
  const length = Math.min(left.length, right.length);

  for (let index = QUERY_KEY_START_INDEX; index < length; index += QUERY_KEY_INDEX_STEP) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

export function isRealtimeInvalidationPayload(data: unknown): data is RealtimeInvalidationPayload {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === REALTIME_INVALIDATION_MESSAGE.INVALIDATE &&
    "topics" in data &&
    Array.isArray(data.topics) &&
    data.topics.every((topic) => typeof topic === "string")
  );
}
