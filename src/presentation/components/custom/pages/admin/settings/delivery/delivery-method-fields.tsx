import { type JSX, useId, useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { formatMinorUnitsToMoneyInput, parseMoneyInputToMinorUnits } from "~/src/modules/_core/utils/currency"
import { INPOST_COURIER_CODE } from "~/src/modules/courier/courier.constants"
import { DELIVERY_METHODS, DELIVERY_METHOD_NAME_MAX_LENGTH } from "~/src/modules/delivery-method/delivery-method.constants"
import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import { sheetSelectTriggerClassName } from "~/src/presentation/components/shadcn/_styles/sheet-control.styles"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
import { Switch } from "~/src/presentation/components/shadcn/switch"

import { ADMIN_DIALOG_LABEL_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { AdminDialogNote } from "~/src/presentation/components/custom/pages/admin/admin-dialog-note"
import { CatalogMoneyInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-money-input"
import {
  type DeliveryMethodFieldErrors,
  type DeliveryMethodFormState,
  NEW_COURIER,
  resolveFormCourierId,
  usesInpostOnly,
} from "~/src/presentation/components/custom/pages/admin/settings/delivery/delivery-method-form.utils"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const VALIDATION_NAMESPACE = "pages.admin.settings.delivery.validation"

const NAME_FIELDS = [
  { labelKey: "namePl", locale: "pl-PL" },
  { labelKey: "nameEn", locale: "en-US" },
] as const

const TypeAndCarrierFields = ({ couriers, errors, onChange, state }: Readonly<DeliveryMethodFieldsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery")
  const typeId = useId()
  const carrierId = useId()
  const courierNameId = useId()
  const typeItems = useMemo(() => DELIVERY_METHODS.map((value) => ({ label: t(`methods.types.${value}`), value })), [t])
  const carrierItems = useMemo(
    () => [...couriers.map((courier) => ({ label: courier.name, value: courier.id })), { label: t("form.newCarrier"), value: NEW_COURIER }],
    [couriers, t],
  )
  const courierId = resolveFormCourierId(state, couriers)
  const isInpost = couriers.some((courier) => courier.id === courierId && courier.internalCode === INPOST_COURIER_CODE)

  return (
    <>
      <div className="space-y-2">
        <Label className={ADMIN_DIALOG_LABEL_CLASS} htmlFor={typeId}>
          {t("form.type")}
        </Label>
        <Select
          items={typeItems}
          onValueChange={(type) => {
            if (type !== null && type !== state.type) {
              onChange({ type })
            }
          }}
          value={state.type}
        >
          <SelectTrigger className={sheetSelectTriggerClassName} id={typeId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className={ADMIN_DIALOG_LABEL_CLASS} htmlFor={carrierId}>
          {t("form.carrier")}
        </Label>
        <Select
          disabled={usesInpostOnly(state.type)}
          items={carrierItems}
          onValueChange={(next) => {
            if (next !== null && next !== courierId) {
              onChange({ courierId: next })
            }
          }}
          value={courierId}
        >
          <SelectTrigger className={sheetSelectTriggerClassName} id={carrierId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {carrierItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {usesInpostOnly(state.type) && <p className="text-[12px] text-muted-foreground">{t("form.lockerCarrier")}</p>}
        {!usesInpostOnly(state.type) && !isInpost && <AdminDialogNote kind="warning">{t("form.manualShipping")}</AdminDialogNote>}
      </div>
      {courierId === NEW_COURIER && (
        <div className="space-y-2">
          <Label className={ADMIN_DIALOG_LABEL_CLASS} htmlFor={courierNameId}>
            {t("form.newCarrierName")}
          </Label>
          <Input
            aria-invalid={errors["courier.name"] !== undefined}
            id={courierNameId}
            onChange={(event) => {
              onChange({ courierName: event.target.value })
            }}
            value={state.courierName}
            variant="sheet"
          />
          <ValidationFieldError message={errors["courier.name"]} namespace={VALIDATION_NAMESPACE} />
        </div>
      )}
    </>
  )
}

const NameFields = ({ errors, onChange, state }: Readonly<Omit<DeliveryMethodFieldsProps, "couriers" | "isNew">>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery.form")
  const baseId = useId()

  return (
    <>
      {NAME_FIELDS.map(({ labelKey, locale }) => (
        <div className="space-y-2" key={locale}>
          <Label className={ADMIN_DIALOG_LABEL_CLASS} htmlFor={`${baseId}-${locale}`}>
            {t(labelKey)}
          </Label>
          <Input
            aria-invalid={errors[`names.${locale}`] !== undefined}
            id={`${baseId}-${locale}`}
            lang={locale}
            maxLength={DELIVERY_METHOD_NAME_MAX_LENGTH}
            onChange={(event) => {
              onChange({ names: { ...state.names, [locale]: event.target.value } })
            }}
            value={state.names[locale]}
            variant="sheet"
          />
          <ValidationFieldError message={errors[`names.${locale}`]} namespace={VALIDATION_NAMESPACE} />
        </div>
      ))}
    </>
  )
}

const PriceAndOfferFields = ({ errors, onChange, state }: Readonly<Omit<DeliveryMethodFieldsProps, "couriers" | "isNew">>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery.form")
  const formatLocale = useFormatLocale()
  const offeredId = useId()

  return (
    <>
      <div className="space-y-2">
        <Label className={ADMIN_DIALOG_LABEL_CLASS}>{t("price")}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-muted-foreground">
            {STORE_CURRENCY_CODE}
          </span>
          <CatalogMoneyInput
            aria-label={t("price")}
            ariaInvalid={errors["price"] !== undefined}
            className="pl-12"
            onValueChange={(next) => {
              onChange({ price: next === "" ? undefined : parseMoneyInputToMinorUnits(next, STORE_CURRENCY_CODE, formatLocale) })
            }}
            value={state.price === undefined ? "" : formatMinorUnitsToMoneyInput(state.price, STORE_CURRENCY_CODE, formatLocale)}
          />
        </div>
        <p className="text-[12px] text-muted-foreground">{t("priceHint")}</p>
        <ValidationFieldError message={errors["price"]} namespace={VALIDATION_NAMESPACE} />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label className={ADMIN_DIALOG_LABEL_CLASS} htmlFor={offeredId}>
            {t("offered")}
          </Label>
          <p className="text-[12px] text-muted-foreground">{t("offeredHint")}</p>
        </div>
        <Switch
          checked={state.isActive}
          id={offeredId}
          onCheckedChange={(isActive) => {
            onChange({ isActive })
          }}
        />
      </div>
    </>
  )
}

export const DeliveryMethodFields = (props: Readonly<DeliveryMethodFieldsProps>): JSX.Element => (
  <div className="space-y-4 pt-1 pb-5">
    {props.isNew && <TypeAndCarrierFields {...props} />}
    <NameFields errors={props.errors} onChange={props.onChange} state={props.state} />
    <PriceAndOfferFields errors={props.errors} onChange={props.onChange} state={props.state} />
  </div>
)

interface DeliveryMethodFieldsProps {
  readonly couriers: DeliveryMethod["adminList"]["couriers"]
  readonly errors: DeliveryMethodFieldErrors
  readonly isNew: boolean
  readonly onChange: (patch: Partial<DeliveryMethodFormState>) => void
  readonly state: DeliveryMethodFormState
}
