import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { PRODUCT_ATTRIBUTE_QUERY_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"
import { deleteProductAttributesMutation } from "~/src/modules/product-attribute/use-cases/delete-product-attributes"

export const useDeleteAttributes = (): UseMutationResult<DeleteResult, Error, string[]> => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const queryClient = useQueryClient()

  return useMutation({
    ...deleteProductAttributesMutation,
    onError: (error) => {
      if (errorCode(error) === ERROR_CODES.CONFLICT) {
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
