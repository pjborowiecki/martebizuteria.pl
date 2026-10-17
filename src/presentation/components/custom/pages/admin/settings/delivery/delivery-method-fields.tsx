import { type JSX, useMemo } from "react"

import { Languages, Truck, Wallet } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { formatMinorUnitsToMoneyInput, parseMoneyInputToMinorUnits } from "~/src/modules/_core/utils/currency"
import { COURIER_NAME_MAX_LENGTH, INPOST_COURIER_CODE } from "~/src/modules/courier/courier.constants"
import {
  DELIVERY_METHODS,
  DELIVERY_METHOD_NAME_MAX_LENGTH,
  DELIVERY_METHOD_STATUS,
} from "~/src/modules/delivery-method/delivery-method.constants"
import { type DeliveryMethod } from "~/src/modules/delivery-method/delivery-method.types"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import { Field, FieldDescription } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { AdminDialogNote } from "~/src/presentation/components/custom/pages/admin/admin-dialog-note"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CatalogMoneyInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-money-input"
import {
  type DeliveryMethodFieldErrors,
  type DeliveryMethodFormState,
  NEW_COURIER,
  resolveFormCourierId,
  usesInpostOnly,
} from "~/src/presentation/components/custom/pages/admin/settings/delivery/delivery-method-form.utils"
import { SettingsFormSection } from "~/src/presentation/components/custom/pages/admin/settings/settings-form-section"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const VALIDATION_NAMESPACE = "pages.admin.settings.delivery.validation"

const NAME_FIELDS = [
  { labelKey: "namePl", locale: "pl-PL" },
  { labelKey: "nameEn", locale: "en-US" },
] as const

const SheetSelect = ({ disabled, items, label, onValueChange, value }: Readonly<SheetSelectProps>): JSX.Element => (
  <Select disabled={disabled} items={items} onValueChange={onValueChange} value={value}>
    <SelectTrigger aria-label={label} size="sheet">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
)

const CarrierSection = ({ couriers, errors, onChange, state }: Readonly<DeliveryMethodFieldsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery")
  const typeItems = useMemo(() => DELIVERY_METHODS.map((value) => ({ label: t(`methods.types.${value}`), value })), [t])
  const carrierItems = useMemo(
    () => [...couriers.map((courier) => ({ label: courier.name, value: courier.id })), { label: t("form.newCarrier"), value: NEW_COURIER }],
    [couriers, t],
  )
  const courierId = resolveFormCourierId(state, couriers)
  const isInpost = couriers.some((courier) => courier.id === courierId && courier.internalCode === INPOST_COURIER_CODE)

  return (
    <SettingsFormSection description={t("form.sections.carrierDescription")} icon={Truck} title={t("form.sections.carrier")}>
      <Field className="gap-2">
        <CatalogFormFieldLabel label={t("form.type")} required />
        <SheetSelect
          items={typeItems}
          label={t("form.type")}
          onValueChange={(type) => {
            const next = DELIVERY_METHODS.find((value) => value === type)
            if (next !== undefined && next !== state.type) {
              onChange({ type: next })
            }
          }}
          value={state.type}
        />
      </Field>
      <Field className="gap-2">
        <CatalogFormFieldLabel label={t("form.carrier")} required />
        <SheetSelect
          disabled={usesInpostOnly(state.type)}
          items={carrierItems}
          label={t("form.carrier")}
          onValueChange={(next) => {
            if (next !== null && next !== courierId) {
              onChange({ courierId: next })
            }
          }}
          value={courierId}
        />
        {usesInpostOnly(state.type) && <FieldDescription>{t("form.lockerCarrier")}</FieldDescription>}
        {!usesInpostOnly(state.type) && !isInpost && <AdminDialogNote kind="warning">{t("form.manualShipping")}</AdminDialogNote>}
      </Field>
      {courierId === NEW_COURIER && (
        <Field className="gap-2" data-invalid={errors["courier.name"] !== undefined}>
          <CatalogFormFieldLabel
            counter={`${state.courierName.length}/${COURIER_NAME_MAX_LENGTH}`}
            label={t("form.newCarrierName")}
            required
          />
          <Input
            aria-invalid={errors["courier.name"] !== undefined}
            aria-label={t("form.newCarrierName")}
            maxLength={COURIER_NAME_MAX_LENGTH}
            onChange={(event) => {
              onChange({ courierName: event.target.value })
            }}
            value={state.courierName}
            variant="sheet"
          />
          <ValidationFieldError message={errors["courier.name"]} namespace={VALIDATION_NAMESPACE} />
        </Field>
      )}
    </SettingsFormSection>
  )
}

const NameSection = ({ errors, onChange, state }: Readonly<Omit<DeliveryMethodFieldsProps, "couriers" | "isNew">>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery.form")

  return (
    <SettingsFormSection description={t("sections.nameDescription")} icon={Languages} title={t("sections.name")}>
      {NAME_FIELDS.map(({ labelKey, locale }) => (
        <Field className="gap-2" data-invalid={errors[`names.${locale}`] !== undefined} key={locale}>
          <CatalogFormFieldLabel
            counter={`${state.names[locale].length}/${DELIVERY_METHOD_NAME_MAX_LENGTH}`}
            label={t(labelKey)}
            required
          />
          <Input
            aria-invalid={errors[`names.${locale}`] !== undefined}
            aria-label={t(labelKey)}
            lang={locale}
            maxLength={DELIVERY_METHOD_NAME_MAX_LENGTH}
            onChange={(event) => {
              onChange({ names: { ...state.names, [locale]: event.target.value } })
            }}
            value={state.names[locale]}
            variant="sheet"
          />
          <ValidationFieldError message={errors[`names.${locale}`]} namespace={VALIDATION_NAMESPACE} />
        </Field>
      ))}
    </SettingsFormSection>
  )
}

const PriceSection = ({ errors, onChange, state }: Readonly<Omit<DeliveryMethodFieldsProps, "couriers" | "isNew">>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery")
  const formatLocale = useFormatLocale()
  const statusItems = useMemo(
    () => [DELIVERY_METHOD_STATUS.OFFERED, DELIVERY_METHOD_STATUS.HIDDEN].map((value) => ({ label: t(`status.${value}`), value })),
    [t],
  )

  return (
    <SettingsFormSection description={t("form.sections.priceDescription")} icon={Wallet} title={t("form.sections.price")}>
      <Field className="gap-2" data-invalid={errors["price"] !== undefined}>
        <CatalogFormFieldLabel hint={t("form.priceHint")} label={t("form.price")} required />
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-sm text-muted-foreground/40">
            {STORE_CURRENCY_CODE}
          </span>
          <CatalogMoneyInput
            aria-label={t("form.price")}
            ariaInvalid={errors["price"] !== undefined}
            className="pl-12"
            onValueChange={(next) => {
              onChange({ price: next === "" ? undefined : parseMoneyInputToMinorUnits(next, STORE_CURRENCY_CODE, formatLocale) })
            }}
            value={state.price === undefined ? "" : formatMinorUnitsToMoneyInput(state.price, STORE_CURRENCY_CODE, formatLocale)}
          />
        </div>
        <ValidationFieldError message={errors["price"]} namespace={VALIDATION_NAMESPACE} />
      </Field>
      <Field className="gap-2">
        <CatalogFormFieldLabel hint={t("form.statusHint")} label={t("form.status")} required />
        <SheetSelect
          items={statusItems}
          label={t("form.status")}
          onValueChange={(status) => {
            onChange({ isActive: status === DELIVERY_METHOD_STATUS.OFFERED })
          }}
          value={state.isActive ? DELIVERY_METHOD_STATUS.OFFERED : DELIVERY_METHOD_STATUS.HIDDEN}
        />
      </Field>
    </SettingsFormSection>
  )
}

export const DeliveryMethodFields = (props: Readonly<DeliveryMethodFieldsProps>): JSX.Element => (
  <>
    {props.isNew && <CarrierSection {...props} />}
    <NameSection errors={props.errors} onChange={props.onChange} state={props.state} />
    <PriceSection errors={props.errors} onChange={props.onChange} state={props.state} />
  </>
)

interface SheetSelectProps {
  readonly disabled?: boolean
  readonly items: readonly { readonly label: string; readonly value: string }[]
  readonly label: string
  readonly onValueChange: (value: string | null) => void
  readonly value: string
}

interface DeliveryMethodFieldsProps {
  readonly couriers: DeliveryMethod["adminList"]["couriers"]
  readonly errors: DeliveryMethodFieldErrors
  readonly isNew: boolean
  readonly onChange: (patch: Partial<DeliveryMethodFormState>) => void
  readonly state: DeliveryMethodFormState
}
