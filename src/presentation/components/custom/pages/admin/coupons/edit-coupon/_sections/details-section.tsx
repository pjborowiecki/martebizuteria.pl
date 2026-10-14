import { type JSX } from "react"

import { TicketPercent } from "lucide-react"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { DISCOUNT_CODE_MAX_LENGTH, DISCOUNT_DESCRIPTION_MAX_LENGTH } from "~/src/modules/discount/discount.constants"

import { Field } from "~/src/presentation/components/shadcn/field"
import { InputGroup, InputGroupInput, InputGroupTextarea } from "~/src/presentation/components/shadcn/input-group"

import { CatalogFormFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-error"
import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CatalogFormReadOnlyField } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-read-only-field"
import { catalogFieldStringValue } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.utils"
import { useCouponForm } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-provider"
import { CouponFormSection } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form-section"
import { COUPON_FORM_VALIDATION_KEYS } from "~/src/presentation/components/custom/pages/admin/coupons/edit-coupon/coupon-form.utils"

export const DetailsSection = (): JSX.Element => {
  const t = useTranslations("pages.admin.coupons.form")
  const tCoupons = useTranslations("pages.admin.coupons")
  const { control, couponId, isPending } = useCouponForm()
  const { field: codeField, fieldState: codeState } = useController({ control, name: "code" })
  const { field: descriptionField } = useController({ control, name: "description" })
  const description = catalogFieldStringValue(descriptionField.value)

  return (
    <CouponFormSection description={t("sections.detailsDescription")} icon={TicketPercent} title={t("sections.details")}>
      {couponId !== undefined && <CatalogFormReadOnlyField label={t("id")} value={couponId} />}
      <Field className="gap-2" data-invalid={codeState.invalid}>
        <CatalogFormFieldLabel
          counter={`${codeField.value.length}/${DISCOUNT_CODE_MAX_LENGTH}`}
          hint={t("codeHint")}
          label={t("code")}
          required
        />
        <InputGroup variant="sheet">
          <InputGroupInput
            {...codeField}
            aria-invalid={codeState.invalid}
            aria-label={t("code")}
            autoComplete="off"
            className="font-mono uppercase placeholder:normal-case"
            disabled={isPending}
            maxLength={DISCOUNT_CODE_MAX_LENGTH}
            placeholder={t("codePlaceholder")}
            spellCheck={false}
          />
        </InputGroup>
        <CatalogFormFieldError fieldState={codeState} translate={tCoupons} validationKeySet={COUPON_FORM_VALIDATION_KEYS} />
      </Field>
      <Field className="gap-2">
        <CatalogFormFieldLabel counter={`${description.length}/${DISCOUNT_DESCRIPTION_MAX_LENGTH}`} label={t("description")} />
        <InputGroup variant="sheet">
          <InputGroupTextarea
            {...descriptionField}
            aria-label={t("description")}
            disabled={isPending}
            maxLength={DISCOUNT_DESCRIPTION_MAX_LENGTH}
            placeholder={t("descriptionPlaceholder")}
            rows={3}
            value={description}
          />
        </InputGroup>
      </Field>
    </CouponFormSection>
  )
}
