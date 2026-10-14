import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { DISCOUNT_QUERY_KEYS } from "~/src/modules/discount/discount.constants"
import { deleteDiscountsMutation } from "~/src/modules/discount/use-cases/delete-discounts"

export const useDeleteCoupons = () => {
  const t = useTranslations("pages.admin.coupons.toast")
  const queryClient = useQueryClient()

  return useMutation({
    ...deleteDiscountsMutation,
    onError: () => {
      toast.error(t("deleteErrorTitle"), {
        description: t("deleteErrorDescription"),
      })
    },
    onSuccess: () => {
      void syncQueryInvalidation(queryClient, DISCOUNT_QUERY_KEYS.ADMIN.ALL)
    },
  })
}
