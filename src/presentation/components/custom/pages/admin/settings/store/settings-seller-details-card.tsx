import { type JSX, type SubmitEventHandler, useCallback, useState } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"
import { getAdminSellerDetailsQuery } from "~/src/modules/store-setting/use-cases/get-seller-details"
import { updateSellerDetailsMutation } from "~/src/modules/store-setting/use-cases/update-seller-details"

import { useActionError } from "~/src/hooks/use-action-error"

import { Button } from "~/src/presentation/components/shadcn/button"

import { SettingsCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"
import { SellerDetailsFields } from "~/src/presentation/components/custom/pages/admin/settings/store/seller-details-fields"
import {
  type SellerDetailsFieldErrors,
  toSellerDetailsForm,
  toSellerDetailsSubmission,
} from "~/src/presentation/components/custom/pages/admin/settings/store/seller-details-form.utils"

export const SettingsSellerDetailsCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.store.sellerDetails")
  const actionError = useActionError()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(getAdminSellerDetailsQuery())
  const [form, setForm] = useState(() => toSellerDetailsForm(data))
  const [errors, setErrors] = useState<SellerDetailsFieldErrors>({})
  const save = useMutation({
    ...updateSellerDetailsMutation,
    onError: (error) => {
      toast.error(errorCode(error) === ERROR_CODES.CONFLICT ? t("conflict") : actionError(error))
    },
    onSuccess: async (saved) => {
      setForm(toSellerDetailsForm(saved))
      await Promise.all([
        syncQueryInvalidation(queryClient, STORE_SETTING_QUERY_KEYS.ADMIN.SELLER_DETAILS),
        syncQueryInvalidation(queryClient, STORE_SETTING_QUERY_KEYS.SELLER_DETAILS),
      ])
      toast.success(t("saved"))
    },
  })

  const handleChange = useCallback((patch: Partial<StoreSetting["sellerDetails"]>) => {
    setForm((current) => ({ ...current, values: { ...current.values, ...patch } }))
  }, [])

  const handleSubmit = useCallback<SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      const submission = toSellerDetailsSubmission(form)
      setErrors("errors" in submission ? submission.errors : {})
      if ("input" in submission) {
        save.mutate(submission.input)
      }
    },
    [form, save],
  )

  return (
    <SettingsCard description={t("description")} title={t("title")}>
      <form className="space-y-5 px-4 py-4 lg:px-5" noValidate onSubmit={handleSubmit}>
        <SellerDetailsFields errors={errors} onChange={handleChange} values={form.values} />
        <div className="flex justify-end">
          <Button className="gap-1.5" disabled={save.isPending} size="sm" type="submit">
            {save.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
            {t("save")}
          </Button>
        </div>
      </form>
    </SettingsCard>
  )
}
