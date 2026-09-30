import { useCallback, useState } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { DISCOUNT_QUERY_KEYS } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { createDiscountMutation } from "~/src/modules/discount/use-cases/create-discount"
import { deleteDiscountsMutation } from "~/src/modules/discount/use-cases/delete-discounts"
import { updateDiscountMutation } from "~/src/modules/discount/use-cases/update-discount"

export const useCouponActions = (): UseCouponActionsResult => {
  const t = useTranslations("pages.admin.coupons.toast")
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editing, setEditing] = useState<Discount["adminListItem"] | undefined>(undefined)
  const [deleting, setDeleting] = useState<Discount["adminListItem"] | undefined>(undefined)

  const refresh = useCallback(() => {
    void syncQueryInvalidation(queryClient, DISCOUNT_QUERY_KEYS.ADMIN.ALL)
  }, [queryClient])

  const reportFailure = useCallback(
    (error: Error) => {
      toast.error(t("errorTitle"), {
        description: errorCode(error) === ERROR_CODES.CONFLICT ? t("codeTakenDescription") : t("errorDescription"),
      })
    },
    [t],
  )

  const create = useMutation({ ...createDiscountMutation, onError: reportFailure })
  const update = useMutation({ ...updateDiscountMutation, onError: reportFailure })
  const remove = useMutation({ ...deleteDiscountsMutation, onError: reportFailure })

  const handleCreate = useCallback(() => {
    setEditing(undefined)
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback((coupon: Discount["adminListItem"]) => {
    setEditing(coupon)
    setFormOpen(true)
  }, [])

  const handleRequestDelete = useCallback((coupon: Discount["adminListItem"]) => {
    setDeleting(coupon)
    setDeleteOpen(true)
  }, [])

  const handleSubmit = useCallback(
    (values: Discount["adminFormValues"]) => {
      const target = editing
      if (target === undefined) {
        create.mutate(
          { values },
          {
            onSuccess: ({ code }) => {
              toast.success(t("createdTitle"), { description: t("createdDescription", { code }) })
              setFormOpen(false)
              refresh()
            },
          },
        )

        return
      }

      update.mutate(
        { id: target.id, values },
        {
          onSuccess: ({ code }) => {
            toast.success(t("updatedTitle"), { description: t("updatedDescription", { code }) })
            setFormOpen(false)
            refresh()
          },
        },
      )
    },
    [create, editing, refresh, t, update],
  )

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
    editing,
    formOpen,
    handleConfirmDelete,
    handleCreate,
    handleEdit,
    handleRequestDelete,
    handleSubmit,
    isPending: create.isPending || update.isPending || remove.isPending,
    setDeleteOpen,
    setFormOpen,
  }
}

interface UseCouponActionsResult {
  readonly deleteOpen: boolean
  readonly deleting: Discount["adminListItem"] | undefined
  readonly editing: Discount["adminListItem"] | undefined
  readonly formOpen: boolean
  readonly handleConfirmDelete: () => void
  readonly handleCreate: () => void
  readonly handleEdit: (coupon: Discount["adminListItem"]) => void
  readonly handleRequestDelete: (coupon: Discount["adminListItem"]) => void
  readonly handleSubmit: (values: Discount["adminFormValues"]) => void
  readonly isPending: boolean
  readonly setDeleteOpen: (open: boolean) => void
  readonly setFormOpen: (open: boolean) => void
}
