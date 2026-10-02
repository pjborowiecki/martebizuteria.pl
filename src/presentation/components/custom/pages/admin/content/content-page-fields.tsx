import { type JSX, useId } from "react"

import { Controller, type UseFormReturn, useWatch } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { CONTENT_PAGE_COLUMN_LENGTH } from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"

import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Textarea } from "~/src/presentation/components/shadcn/textarea"

import { ContentEditor } from "~/src/presentation/components/custom/pages/admin/content/editor/content-editor"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const VALIDATION_NAMESPACE = "pages.admin.content"

const trimInput = (value: string): string => value.trim()

export const ContentPageFields = ({
  form,
  locale,
}: Readonly<{ form: UseFormReturn<ContentPage["formValues"]>; locale: SupportedLocale }>): JSX.Element => {
  const t = useTranslations("pages.admin.content.editor")
  const id = useId()
  const { errors } = form.formState
  const description = useWatch({ control: form.control, name: `descriptions.${locale}` })
  const titleError = errors.titles?.[locale]?.message
  const descriptionError = errors.descriptions?.[locale]?.message
  const bodyError = errors.bodies?.[locale]?.message

  return (
    <FieldGroup>
      <Field data-invalid={titleError !== undefined}>
        <FieldLabel htmlFor={`${id}-title`}>{t("fields.title")}</FieldLabel>
        <Input
          aria-invalid={titleError !== undefined}
          id={`${id}-title`}
          {...form.register(`titles.${locale}`, { setValueAs: trimInput })}
        />
        <ValidationFieldError message={titleError} namespace={VALIDATION_NAMESPACE} />
      </Field>

      <Field data-invalid={descriptionError !== undefined}>
        <div className="flex items-baseline justify-between gap-4">
          <FieldLabel htmlFor={`${id}-description`}>{t("fields.description")}</FieldLabel>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("counter", { count: description.length, max: CONTENT_PAGE_COLUMN_LENGTH.description })}
          </span>
        </div>
        <Textarea
          aria-describedby={`${id}-description-hint`}
          aria-invalid={descriptionError !== undefined}
          id={`${id}-description`}
          rows={3}
          {...form.register(`descriptions.${locale}`, { setValueAs: trimInput })}
        />
        <FieldDescription id={`${id}-description-hint`}>{t("fields.descriptionHint")}</FieldDescription>
        <ValidationFieldError message={descriptionError} namespace={VALIDATION_NAMESPACE} />
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
        <FieldDescription id={`${id}-body-hint`}>{t("fields.bodyHint")}</FieldDescription>
        <ValidationFieldError message={bodyError} namespace={VALIDATION_NAMESPACE} />
      </Field>
    </FieldGroup>
  )
}
