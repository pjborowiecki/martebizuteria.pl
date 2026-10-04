import { type QueryClient, type QueryKey } from "@tanstack/react-query"

export const invalidateQueryPrefix = async (queryClient: QueryClient, queryKey: QueryKey): Promise<void> => {
  queryClient.removeQueries({
    fetchStatus: "idle",
    predicate: (query) => query.getObserversCount() === 0 && query.queryType !== "infinite",
    queryKey,
  })

  await Promise.all([
    queryClient.invalidateQueries({ queryKey, refetchType: "active" }),
    queryClient.refetchQueries({ fetchStatus: "fetching", queryKey, type: "inactive" }),
  ])
}
