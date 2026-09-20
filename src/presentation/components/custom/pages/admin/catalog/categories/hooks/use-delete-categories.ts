import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl"

import { CATEGORY_ERROR_CODES, CATEGORY_QUERY_KEYS } from "~/src/modules/product-category/product-category.constants"
import { deleteCategoriesFn } from "~/src/modules/product-category/use-cases/delete-categories"

export const useDeleteCategories = (): UseMutationResult<DeleteResult, Error, readonly string[]> => {
  const t = useTranslations("pages.admin.catalog.categories")
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: readonly string[]) =>
      deleteCategoriesFn({
        data: [...ids],
      }),
    onError: (error) => {
      const code = error instanceof Error ? error.message : ""
      if (code.includes(CATEGORY_ERROR_CODES.HAS_CHILDREN)) {
        toast.error(t("toast.deleteErrorTitle"), {
          description: t("toast.deleteHasChildrenDescription"),
        })
        return
      }
      if (code.includes(CATEGORY_ERROR_CODES.HAS_PRODUCTS)) {
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
          queryKey: CATEGORY_QUERY_KEYS.ADMIN.ALL,
        }),
        queryClient.invalidateQueries({
          queryKey: CATEGORY_QUERY_KEYS.ALL,
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
