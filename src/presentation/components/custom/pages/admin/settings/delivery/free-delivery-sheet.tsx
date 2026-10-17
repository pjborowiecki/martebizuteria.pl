import { type JSX, type SubmitEventHandler, useCallback, useMemo, useState } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Gift } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { formatMinorUnitsToMoneyInput, parseMoneyInputToMinorUnits } from "~/src/modules/_core/utils/currency"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"
import { getAdminFreeDeliveryQuery } from "~/src/modules/store-setting/use-cases/get-free-delivery"
import { setFreeDeliveryThresholdMutation } from "~/src/modules/store-setting/use-cases/set-free-delivery-threshold"

import { useActionError } from "~/src/hooks/use-action-error"
import { useFormatLocale } from "~/src/hooks/use-display-format"

import { Field } from "~/src/presentation/components/shadcn/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CatalogMoneyInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-money-input"
import { SettingsFormSection } from "~/src/presentation/components/custom/pages/admin/settings/settings-form-section"
import {
  SettingsSheet,
  SettingsSheetCancelButton,
  SettingsSheetSubmitButton,
} from "~/src/presentation/components/custom/pages/admin/settings/settings-sheet"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const FREE_DELIVERY_FORM_ID = "free-delivery-form"

const OFFERED = "offered"

const NOT_OFFERED = "notOffered"

export const FreeDeliverySheet = ({ onClose }: Readonly<{ onClose: () => void }>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery.freeDelivery")
  const formatLocale = useFormatLocale()
  const actionError = useActionError()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(getAdminFreeDeliveryQuery())
  const [enabled, setEnabled] = useState(data.threshold !== undefined)
  const [threshold, setThreshold] = useState(data.threshold)
  const [error, setError] = useState<string>()
  const statusItems = useMemo(
    () => [
      { label: t("statusOffered"), value: OFFERED },
      { label: t("statusNotOffered"), value: NOT_OFFERED },
    ],
    [t],
  )
  const save = useMutation({
    ...setFreeDeliveryThresholdMutation,
    onError: (mutationError) => {
      toast.error(actionError(mutationError))
    },
    onSuccess: async () => {
      await Promise.all([
        syncQueryInvalidation(queryClient, STORE_SETTING_QUERY_KEYS.ADMIN.FREE_DELIVERY),
        syncQueryInvalidation(queryClient, STORE_SETTING_QUERY_KEYS.FREE_DELIVERY),
      ])
      toast.success(t("saved"))
      onClose()
    },
  })

  const handleSubmit = useCallback<SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      if (enabled && (threshold === undefined || threshold < 1)) {
        setError("thresholdInvalid")

        return
      }

      setError(undefined)
      save.mutate({ threshold: enabled ? threshold : undefined })
    },
    [enabled, save, threshold],
  )

  return (
    <SettingsSheet
      description={t("description")}
      footer={
        <>
          <SettingsSheetCancelButton disabled={save.isPending} label={t("cancel")} onClick={onClose} />
          <SettingsSheetSubmitButton formId={FREE_DELIVERY_FORM_ID} isPending={save.isPending} label={t("save")} />
        </>
      }
      formId={FREE_DELIVERY_FORM_ID}
      isPending={save.isPending}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t("title")}
    >
      <SettingsFormSection description={t("sectionDescription")} icon={Gift} title={t("section")}>
        <Field className="gap-2">
          <CatalogFormFieldLabel label={t("status")} required />
          <Select
            items={statusItems}
            onValueChange={(value) => {
              setEnabled(value === OFFERED)
            }}
            value={enabled ? OFFERED : NOT_OFFERED}
          >
            <SelectTrigger aria-label={t("status")} size="sheet">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {enabled && (
          <Field className="gap-2" data-invalid={error !== undefined}>
            <CatalogFormFieldLabel hint={t("thresholdHint")} label={t("threshold")} required />
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-sm text-muted-foreground/40">
                {STORE_CURRENCY_CODE}
              </span>
              <CatalogMoneyInput
                aria-label={t("threshold")}
                ariaInvalid={error !== undefined}
                className="pl-12"
                onValueChange={(next) => {
                  setThreshold(next === "" ? undefined : parseMoneyInputToMinorUnits(next, STORE_CURRENCY_CODE, formatLocale))
                }}
                value={threshold === undefined ? "" : formatMinorUnitsToMoneyInput(threshold, STORE_CURRENCY_CODE, formatLocale)}
              />
            </div>
            <ValidationFieldError message={error} namespace="pages.admin.settings.delivery.freeDelivery.validation" />
          </Field>
        )}
      </SettingsFormSection>
    </SettingsSheet>
  )
}
