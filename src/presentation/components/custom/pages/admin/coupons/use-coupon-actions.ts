import { useCallback, useState } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { DISCOUNT_QUERY_KEYS } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { deleteDiscountsMutation } from "~/src/modules/discount/use-cases/delete-discounts"

export const useCouponActions = (): UseCouponActionsResult => {
  const t = useTranslations("pages.admin.coupons.toast")
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<Discount["adminListItem"] | undefined>(undefined)

  const refresh = useCallback(() => {
    void syncQueryInvalidation(queryClient, DISCOUNT_QUERY_KEYS.ADMIN.ALL)
  }, [queryClient])

  const reportFailure = useCallback(() => {
    toast.error(t("errorTitle"), {
      description: t("errorDescription"),
    })
  }, [t])

  const remove = useMutation({ ...deleteDiscountsMutation, onError: reportFailure })

  const handleRequestDelete = useCallback((coupon: Discount["adminListItem"]) => {
    setDeleting(coupon)
    setDeleteOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    const target = deleting
    if (target === undefined) {
      return
    }

    remove.mutate(
      { ids: [target.id] },
      {
        onSuccess: () => {
          toast.success(t("deletedTitle"), { description: t("deletedDescription", { code: target.code }) })
          setDeleteOpen(false)
          refresh()
        },
      },
    )
  }, [deleting, refresh, remove, t])

  return {
    deleteOpen,
    deleting,
    handleConfirmDelete,
    handleRequestDelete,
    isPending: remove.isPending,
    setDeleteOpen,
  }
}

interface UseCouponActionsResult {
  readonly deleteOpen: boolean
  readonly deleting: Discount["adminListItem"] | undefined
  readonly handleConfirmDelete: () => void
  readonly handleRequestDelete: (coupon: Discount["adminListItem"]) => void
  readonly isPending: boolean
  readonly setDeleteOpen: (open: boolean) => void
}
