import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl"

import { PRODUCT_ATTRIBUTE_ERROR_CODES, PRODUCT_ATTRIBUTE_QUERY_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"
import { deleteProductAttributesFn } from "~/src/modules/product-attribute/use-cases/delete-product-attributes"
export const useDeleteAttributes = (): UseMutationResult<DeleteResult, Error, readonly string[]> => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: readonly string[]) =>
      deleteProductAttributesFn({
        data: [...ids],
      }),
    onError: (error) => {
      const code = error instanceof Error ? error.message : ""
      if (code.includes(PRODUCT_ATTRIBUTE_ERROR_CODES.IN_USE)) {
        toast.error(t("toast.deleteErrorTitle"), {
          description: t("toast.deleteInUseDescription"),
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
          queryKey: PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.ALL,
        }),
        queryClient.invalidateQueries({
          queryKey: PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.STATS,
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
