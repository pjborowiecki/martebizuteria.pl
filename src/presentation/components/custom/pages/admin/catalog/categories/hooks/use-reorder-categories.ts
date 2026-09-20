import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl"

import { CATEGORY_QUERY_KEYS } from "~/src/modules/product-category/product-category.constants"
import { reorderCategoriesFn } from "~/src/modules/product-category/use-cases/reorder-categories"

/** The list owns optimistic order; settling refreshes both admin and storefront queries. */
export const useReorderCategories = (): UseMutationResult<
  {
    ok: boolean
  },
  Error,
  readonly string[]
> => {
  const t = useTranslations("pages.admin.catalog.categories")
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: readonly string[]) =>
      reorderCategoriesFn({
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
          queryKey: CATEGORY_QUERY_KEYS.ADMIN.ALL,
        }),
        queryClient.invalidateQueries({
          queryKey: CATEGORY_QUERY_KEYS.ALL,
        }),
      ])
    },
  })
}
