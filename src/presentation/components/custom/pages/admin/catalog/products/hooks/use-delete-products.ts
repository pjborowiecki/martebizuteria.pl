import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { deleteProductsMutation } from "~/src/modules/product/use-cases/delete-products"

export const useDeleteProducts = (): UseMutationResult<DeleteResult, Error, string[]> => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const queryClient = useQueryClient()

  return useMutation({
    ...deleteProductsMutation,
    onError: () => {
      toast.error(t("toast.deleteErrorTitle"), {
        description: t("toast.deleteErrorDescription"),
      })
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: PRODUCT_QUERY_KEYS.ADMIN.ALL,
        }),
        queryClient.invalidateQueries({
          queryKey: PRODUCT_QUERY_KEYS.ADMIN.STATS,
        }),
        queryClient.invalidateQueries({
          queryKey: PRODUCT_QUERY_KEYS.ALL,
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
