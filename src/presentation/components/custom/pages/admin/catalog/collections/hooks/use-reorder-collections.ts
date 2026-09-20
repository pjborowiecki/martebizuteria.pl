import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl"

import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { reorderCollectionsFn } from "~/src/modules/product-collection/use-cases/reorder-collections"

/** The list owns optimistic order; settling refreshes both admin and storefront queries. */
export const useReorderCollections = (): UseMutationResult<
  {
    ok: boolean
  },
  Error,
  readonly string[]
> => {
  const t = useTranslations("pages.admin.catalog.collections")
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: readonly string[]) =>
      reorderCollectionsFn({
        data: [...orderedIds],
      }),
    onError: () => {
      toast.error(t("toast.reorderErrorTitle"), {
        description: t("toast.reorderErrorDescription"),
      })
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: COLLECTION_QUERY_KEYS.ADMIN.ALL,
        }),
        queryClient.invalidateQueries({
          queryKey: COLLECTION_QUERY_KEYS.ALL,
        }),
      ])
    },
  })
}
