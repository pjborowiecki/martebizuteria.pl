import type { QueryClient, QueryKey } from "@tanstack/react-query";

const QUERY_INVALIDATION_CHANNEL = "marte-query-invalidation";

interface QueryInvalidationMessage {
  readonly queryKey: QueryKey;
}

const invalidationChannel = globalThis.BroadcastChannel === undefined ? undefined : new BroadcastChannel(QUERY_INVALIDATION_CHANNEL);

const queryClientsWithInvalidationListener = new WeakSet<QueryClient>();

function handleInvalidationMessage(queryClient: QueryClient, event: MessageEvent<QueryInvalidationMessage>): void {
  void queryClient.invalidateQueries({
    queryKey: event.data.queryKey,
    refetchType: "all"
  });
}

/** Listen for invalidations from other tabs (each tab has its own QueryClient). */
export function setupQueryClientInvalidationBroadcast(queryClient: QueryClient): void {
  if (invalidationChannel === undefined || queryClientsWithInvalidationListener.has(queryClient)) {
    return;
  }

  queryClientsWithInvalidationListener.add(queryClient);
  invalidationChannel.addEventListener("message", (event: MessageEvent<QueryInvalidationMessage>) => {
    handleInvalidationMessage(queryClient, event);
  });
}

function publishInvalidation(channel: BroadcastChannel, message: QueryInvalidationMessage): void {
  const deliver: (payload: QueryInvalidationMessage) => void = channel.postMessage.bind(channel);
  deliver(message);
}

/** Invalidate in this tab and notify other open tabs (no polling). */
export function syncQueryInvalidation(queryClient: QueryClient, queryKey: QueryKey): Promise<void> {
  if (invalidationChannel !== undefined) {
    publishInvalidation(invalidationChannel, { queryKey });
  }

  return queryClient.invalidateQueries({ queryKey, refetchType: "all" });
}
