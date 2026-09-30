import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { reorderCollectionsMutation } from "~/src/modules/product-collection/use-cases/reorder-collections"

export const useReorderCollections = (): UseMutationResult<
  {
    ok: boolean
  },
  Error,
  string[]
> => {
  const t = useTranslations("pages.admin.catalog.collections")
  const queryClient = useQueryClient()

  return useMutation({
    ...reorderCollectionsMutation,
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
