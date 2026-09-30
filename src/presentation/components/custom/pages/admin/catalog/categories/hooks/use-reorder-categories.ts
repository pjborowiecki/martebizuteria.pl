import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { CATEGORY_QUERY_KEYS } from "~/src/modules/product-category/product-category.constants"
import { reorderCategoriesMutation } from "~/src/modules/product-category/use-cases/reorder-categories"

export const useReorderCategories = (): UseMutationResult<
  {
    ok: boolean
  },
  Error,
  string[]
> => {
  const t = useTranslations("pages.admin.catalog.categories")
  const queryClient = useQueryClient()

  return useMutation({
    ...reorderCategoriesMutation,
    onError: () => {
      toast.error(t("toast.reorderErrorTitle"), {
        description: t("toast.reorderErrorDescription"),
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
  })
}
