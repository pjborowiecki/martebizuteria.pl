import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { PRODUCT_ATTRIBUTE_QUERY_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"
import { reorderProductAttributesMutation } from "~/src/modules/product-attribute/use-cases/reorder-product-attributes"

export const useReorderAttributes = (): UseMutationResult<
  {
    ok: boolean
  },
  Error,
  string[]
> => {
  const t = useTranslations("pages.admin.catalog.attributes")
  const queryClient = useQueryClient()

  return useMutation({
    ...reorderProductAttributesMutation,
    onError: () => {
      toast.error(t("toast.reorderErrorTitle"), {
        description: t("toast.reorderErrorDescription"),
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
  })
}
