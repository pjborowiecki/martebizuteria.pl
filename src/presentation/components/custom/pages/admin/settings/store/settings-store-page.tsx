import { type JSX, type SubmitEventHandler, useCallback, useState } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { SELLER_DETAILS_FIELDS, STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"
import { getAdminSellerDetailsQuery } from "~/src/modules/store-setting/use-cases/get-seller-details"
import { updateSellerDetailsMutation } from "~/src/modules/store-setting/use-cases/update-seller-details"

import { useActionError } from "~/src/hooks/use-action-error"

import { SettingsCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"
import { SettingsPageLayout } from "~/src/presentation/components/custom/pages/admin/settings/settings-page-layout"
import { SettingsSaveActions } from "~/src/presentation/components/custom/pages/admin/settings/settings-save-actions"
import { SellerDetailsFields } from "~/src/presentation/components/custom/pages/admin/settings/store/seller-details-fields"
import {
  type SellerDetailsFieldErrors,
  toSellerDetailsForm,
  toSellerDetailsSubmission,
} from "~/src/presentation/components/custom/pages/admin/settings/store/seller-details-form.utils"

const SELLER_DETAILS_FORM_ID = "seller-details-form"

export const SettingsStorePage = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.store.sellerDetails")
  const actionError = useActionError()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(getAdminSellerDetailsQuery())
  const [saved, setSaved] = useState(() => toSellerDetailsForm(data))
  const [form, setForm] = useState(saved)
  const [errors, setErrors] = useState<SellerDetailsFieldErrors>({})
  const isDirty = SELLER_DETAILS_FIELDS.some((field) => form.values[field] !== saved.values[field])
  const save = useMutation({
    ...updateSellerDetailsMutation,
    onError: (error) => {
      toast.error(errorCode(error) === ERROR_CODES.CONFLICT ? t("conflict") : actionError(error))
    },
    onSuccess: async (stored) => {
      const next = toSellerDetailsForm(stored)
      setSaved(next)
      setForm(next)
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
    <SettingsPageLayout
      actions={
        <SettingsSaveActions formId={SELLER_DETAILS_FORM_ID} isDirty={isDirty} isPending={save.isPending} savedAt={saved.updatedAt} />
      }
      active="store"
    >
      <SettingsCard description={t("description")} title={t("title")}>
        <form className="px-4 py-5 lg:px-5" id={SELLER_DETAILS_FORM_ID} noValidate onSubmit={handleSubmit}>
          <SellerDetailsFields disabled={save.isPending} errors={errors} onChange={handleChange} values={form.values} />
        </form>
      </SettingsCard>
    </SettingsPageLayout>
  )
}
