import { type JSX, useId } from "react"

import { Controller, type UseFormReturn, useWatch } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { NEWSLETTER_CAMPAIGN_COLUMN_LENGTH } from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"

import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { ContentEditor } from "~/src/presentation/components/custom/pages/admin/content/editor/content-editor"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const VALIDATION_NAMESPACE = "pages.admin.marketing"

const trimInput = (value: string): string => value.trim()

export const NewsletterComposerFields = ({
  form,
  locale,
}: Readonly<{ form: UseFormReturn<NewsletterCampaign["composeValues"]>; locale: SupportedLocale }>): JSX.Element => {
  const t = useTranslations("pages.admin.marketing.composer")
  const id = useId()
  const { errors } = form.formState
  const subject = useWatch({ control: form.control, name: `subjects.${locale}` })
  const subjectError = errors.subjects?.[locale]?.message
  const bodyError = errors.bodies?.[locale]?.message

  return (
    <FieldGroup>
      <Field data-invalid={subjectError !== undefined}>
        <div className="flex items-baseline justify-between gap-4">
          <FieldLabel htmlFor={`${id}-subject`}>{t("fields.subject")}</FieldLabel>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("counter", { count: subject.length, max: NEWSLETTER_CAMPAIGN_COLUMN_LENGTH.subject })}
          </span>
        </div>
        <Input
          aria-invalid={subjectError !== undefined}
          id={`${id}-subject`}
          {...form.register(`subjects.${locale}`, { setValueAs: trimInput })}
        />
        <ValidationFieldError message={subjectError} namespace={VALIDATION_NAMESPACE} />
      </Field>

      <Field data-invalid={bodyError !== undefined}>
        <FieldTitle>{t("fields.body")}</FieldTitle>
        <Controller
          control={form.control}
          name={`bodies.${locale}`}
          render={({ field }) => (
            <ContentEditor
              fieldRef={field.ref}
              invalid={bodyError !== undefined}
              label={t("fields.body")}
              markdown={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <FieldDescription>{t("fields.bodyHint")}</FieldDescription>
        <ValidationFieldError message={bodyError} namespace={VALIDATION_NAMESPACE} />
      </Field>
    </FieldGroup>
  )
}
