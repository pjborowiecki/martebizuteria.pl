import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { deleteCollectionsMutation } from "~/src/modules/product-collection/use-cases/delete-collections"

export const useDeleteCollections = (): UseMutationResult<DeleteResult, Error, string[]> => {
  const t = useTranslations("pages.admin.catalog.collections")
  const queryClient = useQueryClient()

  return useMutation({
    ...deleteCollectionsMutation,
    onError: (error) => {
      if (errorCode(error) === ERROR_CODES.CONFLICT) {
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
