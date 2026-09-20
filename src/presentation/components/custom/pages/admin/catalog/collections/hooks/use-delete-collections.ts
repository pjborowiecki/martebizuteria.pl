import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl"

import { COLLECTION_ERROR_CODES, COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { deleteCollectionsFn } from "~/src/modules/product-collection/use-cases/delete-collections"

export const useDeleteCollections = (): UseMutationResult<DeleteResult, Error, readonly string[]> => {
  const t = useTranslations("pages.admin.catalog.collections")
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: readonly string[]) =>
      deleteCollectionsFn({
        data: [...ids],
      }),
    onError: (error) => {
      const code = error instanceof Error ? error.message : ""
      if (code.includes(COLLECTION_ERROR_CODES.HAS_PRODUCTS)) {
        toast.error(t("toast.deleteErrorTitle"), {
          description: t("toast.deleteHasProductsDescription"),
        })
        return
      }
      toast.error(t("toast.deleteErrorTitle"), {
        description: t("toast.deleteErrorDescription"),
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
    onSuccess: (result) => {
      toast.success(t("toast.deleteSuccessTitle"), {
        description: t("toast.deleteSuccessDescription", {
          count: String(result.deleted),
        }),
      })
    },
  })
}
interface DeleteResult {
  readonly deleted: number
  readonly ok: boolean
}
