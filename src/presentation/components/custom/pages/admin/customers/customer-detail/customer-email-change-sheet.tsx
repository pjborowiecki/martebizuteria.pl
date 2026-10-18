import { type JSX, type SubmitEventHandler, useCallback, useState } from "react"

import { useMutation } from "@tanstack/react-query"
import { Mail, ShieldCheck, UserCheck } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { EMAIL_MAX_LENGTH } from "~/src/integrations/better-auth/auth.constraints"

import { requestCustomerEmailChangeMutation } from "~/src/modules/user/use-cases/request-customer-email-change"
import {
  ADMIN_CUSTOMER_FORM_FIELD_MAX,
  CUSTOMER_EMAIL_CHANGE_ATTEMPTS,
  CUSTOMER_EMAIL_CHANGE_ERROR,
} from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import { useActionError } from "~/src/hooks/use-action-error"

import { Field } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { CatalogFormReadOnlyField } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-read-only-field"
import { SettingsFormSection } from "~/src/presentation/components/custom/pages/admin/settings/settings-form-section"
import {
  SettingsSheet,
  SettingsSheetCancelButton,
  SettingsSheetSubmitButton,
} from "~/src/presentation/components/custom/pages/admin/settings/settings-sheet"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const EMAIL_CHANGE_FORM_ID = "customer-email-change-form"

const EMAIL_CHANGE_VALIDATION_NAMESPACE = "pages.admin.customerDetail.emailChange.validation"

const EMAIL_CHANGE_ERRORS: ReadonlySet<string> = new Set(Object.values(CUSTOMER_EMAIL_CHANGE_ERROR))

const EMAIL_CHANGE_RULES = ["link", "notice", "signedIn", "attempts", "audit"] as const

type EmailChangeFieldName = keyof User["customerEmailChangeForm"]

const EmailChangeRulesSection = (): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail.emailChange.rules")

  return (
    <SettingsFormSection description={t("description")} icon={ShieldCheck} title={t("title")}>
      <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-muted-foreground">
        {EMAIL_CHANGE_RULES.map((rule) => (
          <li key={rule}>{t(rule, { max: CUSTOMER_EMAIL_CHANGE_ATTEMPTS.MAX })}</li>
        ))}
      </ul>
    </SettingsFormSection>
  )
}

const EmailChangeField = ({
  disabled,
  error,
  hint,
  label,
  maxLength,
  name,
  placeholder,
  type,
}: Readonly<EmailChangeFieldProps>): JSX.Element => (
  <Field className="gap-2" data-invalid={error !== undefined}>
    <CatalogFormFieldLabel hint={hint} label={label} required />
    <Input
      aria-invalid={error !== undefined}
      aria-label={label}
      autoComplete="off"
      disabled={disabled}
      maxLength={maxLength}
      name={name}
      placeholder={placeholder}
      type={type}
      variant="sheet"
    />
    <ValidationFieldError message={error} namespace={EMAIL_CHANGE_VALIDATION_NAMESPACE} />
  </Field>
)

export const CustomerEmailChangeSheet = ({ customer, onClose }: Readonly<CustomerEmailChangeSheetProps>): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail.emailChange")
  const actionError = useActionError()
  const [errors, setErrors] = useState<Partial<Record<EmailChangeFieldName, string>>>({})
  const request = useMutation({
    ...requestCustomerEmailChangeMutation,
    onError: (error) => {
      toast.error(EMAIL_CHANGE_ERRORS.has(error.message) ? t(`errors.${error.message}`) : actionError(error))
    },
    onSuccess: ({ newEmail }) => {
      toast.success(t("sent", { email: newEmail }))
      onClose()
    },
  })

  const handleSubmit = useCallback<SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const parsed = userZodSchemas.customerEmailChangeForm.safeParse({
        newEmail: data.get("newEmail"),
        orderNumber: data.get("orderNumber"),
        postalCode: data.get("postalCode"),
      })
      if (!parsed.success) {
        setErrors(Object.fromEntries(parsed.error.issues.toReversed().map((issue) => [String(issue.path[0]), issue.message])))

        return
      }

      setErrors({})
      request.mutate({ ...parsed.data, userId: customer.id })
    },
    [customer.id, request],
  )

  return (
    <SettingsSheet
      description={t("description", { name: customer.name })}
      footer={
        <>
          <SettingsSheetCancelButton disabled={request.isPending} label={t("cancel")} onClick={onClose} />
          <SettingsSheetSubmitButton formId={EMAIL_CHANGE_FORM_ID} isPending={request.isPending} label={t("submit")} />
        </>
      }
      formId={EMAIL_CHANGE_FORM_ID}
      isPending={request.isPending}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={t("title")}
    >
      <SettingsFormSection description={t("verify.description")} icon={UserCheck} title={t("verify.title")}>
        <EmailChangeField
          disabled={request.isPending}
          error={errors.orderNumber}
          hint={t("verify.orderNumberHint")}
          label={t("verify.orderNumber")}
          maxLength={ADMIN_CUSTOMER_FORM_FIELD_MAX.ORDER_NUMBER}
          name="orderNumber"
          placeholder={t("verify.orderNumberPlaceholder")}
          type="text"
        />
        <EmailChangeField
          disabled={request.isPending}
          error={errors.postalCode}
          hint={t("verify.postalCodeHint")}
          label={t("verify.postalCode")}
          maxLength={ADMIN_CUSTOMER_FORM_FIELD_MAX.POSTAL_CODE}
          name="postalCode"
          placeholder={t("verify.postalCodePlaceholder")}
          type="text"
        />
      </SettingsFormSection>
      <SettingsFormSection description={t("address.description")} icon={Mail} title={t("address.title")}>
        <CatalogFormReadOnlyField label={t("address.current")} value={customer.email} />
        <EmailChangeField
          disabled={request.isPending}
          error={errors.newEmail}
          hint={t("address.newEmailHint")}
          label={t("address.newEmail")}
          maxLength={EMAIL_MAX_LENGTH}
          name="newEmail"
          placeholder={t("address.newEmailPlaceholder")}
          type="email"
        />
      </SettingsFormSection>
      <EmailChangeRulesSection />
    </SettingsSheet>
  )
}

interface CustomerEmailChangeSheetProps {
  readonly customer: Pick<User["adminCustomerDetail"], "email" | "id" | "name">
  readonly onClose: () => void
}

interface EmailChangeFieldProps {
  readonly disabled: boolean
  readonly error: string | undefined
  readonly hint: string
  readonly label: string
  readonly maxLength: number
  readonly name: EmailChangeFieldName
  readonly placeholder: string
  readonly type: "email" | "text"
}
