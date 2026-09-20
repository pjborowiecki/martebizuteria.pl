import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl"

import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { reorderProductsFn } from "~/src/modules/product/use-cases/reorder-products"
export const useReorderProducts = (): UseMutationResult<
  {
    ok: boolean
  },
  Error,
  readonly string[]
> => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: readonly string[]) =>
      reorderProductsFn({
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
          queryKey: PRODUCT_QUERY_KEYS.ADMIN.ALL,
        }),
        queryClient.invalidateQueries({
          queryKey: PRODUCT_QUERY_KEYS.ADMIN.PAGE,
        }),
        queryClient.invalidateQueries({
          queryKey: PRODUCT_QUERY_KEYS.ALL,
        }),
      ])
    },
  })
}
