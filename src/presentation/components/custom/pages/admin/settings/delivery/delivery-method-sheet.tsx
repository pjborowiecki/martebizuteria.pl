import { type JSX, type SubmitEventHandler, useCallback, useState } from "react"

import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

import { DeliveryMethodFields } from "~/src/presentation/components/custom/pages/admin/settings/delivery/delivery-method-fields"
import {
  type DeliveryMethodFieldErrors,
  type DeliveryMethodFormState,
  toCreateDeliveryMethodInput,
  toDeliveryMethodFormState,
  toUpdateDeliveryMethodInput,
} from "~/src/presentation/components/custom/pages/admin/settings/delivery/delivery-method-form.utils"
import { useDeliveryMethodActions } from "~/src/presentation/components/custom/pages/admin/settings/delivery/use-delivery-method-actions"
import {
  SettingsSheet,
  SettingsSheetCancelButton,
  SettingsSheetSubmitButton,
} from "~/src/presentation/components/custom/pages/admin/settings/settings-sheet"

const DELIVERY_METHOD_FORM_ID = "delivery-method-form"

export const DeliveryMethodSheet = ({ couriers, method, onClose }: Readonly<DeliveryMethodSheetProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery")
  const locale = useLocale()
  const { create, update } = useDeliveryMethodActions()
  const [state, setState] = useState(() => toDeliveryMethodFormState(method, couriers))
  const [errors, setErrors] = useState<DeliveryMethodFieldErrors>({})
  const isPending = create.isPending || update.isPending

  const handleChange = useCallback((patch: Partial<DeliveryMethodFormState>) => {
    setState((current) => ({ ...current, ...patch }))
  }, [])

  const handleSubmit = useCallback<SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      const saved = {
        onSuccess: () => {
          toast.success(t(method === undefined ? "methods.created" : "methods.saved"))
          onClose()
        },
      }
      const submission = method === undefined ? toCreateDeliveryMethodInput(state, couriers) : toUpdateDeliveryMethodInput(state, method)
      setErrors("errors" in submission ? submission.errors : {})
      if ("errors" in submission) {
        return
      }

      if ("type" in submission.input) {
        create.mutate(submission.input, saved)
      } else {
        update.mutate(submission.input, saved)
      }
    },
    [couriers, create, method, onClose, state, t, update],
  )

  return (
    <SettingsSheet
      description={method === undefined ? t("form.description") : `${t(`methods.types.${method.type}`)} · ${method.courier.name}`}
      footer={
        <>
          <SettingsSheetCancelButton disabled={isPending} label={t("form.cancel")} onClick={onClose} />
          <SettingsSheetSubmitButton
            formId={DELIVERY_METHOD_FORM_ID}
            isPending={isPending}
            label={method === undefined ? t("form.create") : t("form.save")}
          />
        </>
      }
      formId={DELIVERY_METHOD_FORM_ID}
      isPending={isPending}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={method === undefined ? t("form.addTitle") : t("form.editTitle", { name: resolveLocalizedString(method.names, locale) })}
    >
      <DeliveryMethodFields couriers={couriers} errors={errors} isNew={method === undefined} onChange={handleChange} state={state} />
    </SettingsSheet>
  )
}

interface DeliveryMethodSheetProps {
  readonly couriers: DeliveryMethod["adminList"]["couriers"]
  readonly method: DeliveryMethod["adminMethod"] | undefined
  readonly onClose: () => void
}
