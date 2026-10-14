import { type BaseSyntheticEvent, type JSX, type ReactNode, createContext, useCallback, useContext, useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type Control, type UseFormClearErrors, type UseFormSetError, type UseFormSetValue, useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"
import type * as zod from "zod"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { DISCOUNT_QUERY_KEYS } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { discountZodSchemas } from "~/src/modules/discount/discount.zod"
import { createDiscountMutation } from "~/src/modules/discount/use-cases/create-discount"
import { updateDiscountMutation } from "~/src/modules/discount/use-cases/update-discount"

import { toCouponFormValues } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form.utils"

const useSaveCoupon = ({ couponId, onSaved, setError }: UseSaveCouponOptions) => {
  const t = useTranslations("pages.admin.coupons.toast")
  const queryClient = useQueryClient()
  const reportFailure = useCallback(
    (error: Error) => {
      if (errorCode(error) === ERROR_CODES.CONFLICT) {
        setError("code", {
          message: t("codeTakenDescription"),
          type: "manual",
        })
        toast.error(t("errorTitle"), {
          description: t("codeTakenDescription"),
        })

        return
      }

      toast.error(t("errorTitle"), {
        description: t("errorDescription"),
      })
    },
    [setError, t],
  )

  const create = useMutation({ ...createDiscountMutation, onError: reportFailure })
  const update = useMutation({ ...updateDiscountMutation, onError: reportFailure })

  const save = useCallback(
    (values: Discount["adminFormValues"]) => {
      const finish = (title: string, description: string) => {
        toast.success(title, { description })
        void syncQueryInvalidation(queryClient, DISCOUNT_QUERY_KEYS.ADMIN.ALL)
        onSaved()
      }

      if (couponId === undefined) {
        create.mutate(
          { values },
          {
            onSuccess: ({ code }) => {
              finish(t("createdTitle"), t("createdDescription", { code }))
            },
          },
        )

        return
      }

      update.mutate(
        { id: couponId, values },
        {
          onSuccess: ({ code }) => {
            finish(t("updatedTitle"), t("updatedDescription", { code }))
          },
        },
      )
    },
    [couponId, create, onSaved, queryClient, t, update],
  )

  return {
    isPending: create.isPending || update.isPending,
    save,
  }
}

export const CouponFormProvider = ({ children, coupon, mode, onClose }: Readonly<CouponFormProviderProps>): JSX.Element => {
  const t = useTranslations("pages.admin.coupons.validation")
  const couponId = mode === "edit" ? coupon?.id : undefined
  const defaultValues = useMemo(() => toCouponFormValues(mode === "edit" ? coupon : undefined), [coupon, mode])
  const resolver = useMemo(() => zodResolver(discountZodSchemas.adminDiscountFormValues), [])
  const form = useForm<CouponFormInput, unknown, Discount["adminFormValues"]>({
    defaultValues,
    resolver,
  })

  const { clearErrors, control, setError, setValue } = form
  const { isPending, save } = useSaveCoupon({
    couponId,
    onSaved: onClose,
    setError,
  })

  const reportInvalid = useCallback(() => {
    toast.error(t("submitBlockedTitle"), {
      description: t("submitBlockedDescription"),
    })
  }, [t])

  const onFormSubmit = useCallback(
    (event?: BaseSyntheticEvent) => {
      void form.handleSubmit(save, reportInvalid)(event)
    },
    [form, reportInvalid, save],
  )

  const value = useMemo<CouponFormContextValue>(
    () => ({
      clearErrors,
      control,
      couponId,
      dismiss: onClose,
      isPending,
      mode,
      onFormSubmit,
      setValue,
    }),
    [clearErrors, control, couponId, isPending, mode, onClose, onFormSubmit, setValue],
  )

  return <CouponFormContext.Provider value={value}>{children}</CouponFormContext.Provider>
}

export const CouponForm = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const { onFormSubmit } = useCouponForm()

  return (
    <form className="min-h-0 flex-1 overflow-y-auto" id={COUPON_FORM_ID} noValidate onSubmit={onFormSubmit}>
      {children}
    </form>
  )
}

export const useCouponForm = (): CouponFormContextValue => {
  const context = useContext(CouponFormContext)
  if (context === undefined) {
    throw new Error("useCouponForm must be used within CouponFormProvider")
  }

  return context
}

export const COUPON_FORM_ID = "coupon-form"

export type CouponFormMode = "create" | "edit"

export interface CouponFormContextValue {
  readonly clearErrors: UseFormClearErrors<CouponFormInput>
  readonly control: Control<CouponFormInput, unknown, Discount["adminFormValues"]>
  readonly couponId: string | undefined
  readonly dismiss: () => void
  readonly isPending: boolean
  readonly mode: CouponFormMode
  readonly onFormSubmit: (event?: BaseSyntheticEvent) => void
  readonly setValue: UseFormSetValue<CouponFormInput>
}

export type CouponFormInput = zod.input<typeof discountZodSchemas.adminDiscountFormValues>

const CouponFormContext = createContext<CouponFormContextValue | undefined>(undefined)

interface UseSaveCouponOptions {
  readonly couponId: string | undefined
  readonly onSaved: () => void
  readonly setError: UseFormSetError<CouponFormInput>
}

interface CouponFormProviderProps {
  readonly children: ReactNode
  readonly coupon: Discount["adminListItem"] | undefined
  readonly mode: CouponFormMode
  readonly onClose: () => void
}
