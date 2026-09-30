import { type QueryClient, type QueryKey } from "@tanstack/react-query"

const QUERY_INVALIDATION_CHANNEL = "marte-query-invalidation"

const invalidationChannelStore: {
  channel: BroadcastChannel | undefined
} = {
  channel: undefined,
}

const queryClientsWithInvalidationListener = new WeakSet<QueryClient>()

const getInvalidationChannel = (): BroadcastChannel | undefined => {
  if (typeof document === "undefined" || typeof BroadcastChannel === "undefined") {
    return undefined
  }

  try {
    invalidationChannelStore.channel ??= new BroadcastChannel(QUERY_INVALIDATION_CHANNEL)

    return invalidationChannelStore.channel
  } catch {
    return undefined
  }
}

export const setupQueryClientInvalidationBroadcast = (queryClient: QueryClient): void => {
  const channel = getInvalidationChannel()
  if (channel === undefined || queryClientsWithInvalidationListener.has(queryClient)) {
    return
  }
  queryClientsWithInvalidationListener.add(queryClient)
  channel.addEventListener("message", ({ data }: MessageEvent<unknown>) => {
    if (typeof data !== "object" || data === null || !("queryKey" in data) || !Array.isArray(data.queryKey)) {
      return
    }
    void queryClient.invalidateQueries({
      queryKey: data.queryKey,
      refetchType: "all",
    })
  })
}

export const syncQueryInvalidation = (queryClient: QueryClient, queryKey: QueryKey): Promise<void> => {
  const invalidation = queryClient.invalidateQueries({
    queryKey,
    refetchType: "all",
  })

  try {
    getInvalidationChannel()?.postMessage({
      queryKey,
    })
  } catch {
    return invalidation
  }

  return invalidation
}
