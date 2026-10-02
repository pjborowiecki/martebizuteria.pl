import zod from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { localeField } from "~/src/modules/_core/utils/zod-fields"
import {
  CONTENT_PAGE_COLUMN_LENGTH,
  CONTENT_PAGE_HANDLES,
  CONTENT_PAGE_VALIDATION_KEYS,
} from "~/src/modules/content-page/content-page.constants"
import { hasOnlyPublishableMarkdown } from "~/src/modules/content-page/content-page.validation.utils"

const handleField = zod.enum(CONTENT_PAGE_HANDLES)

const titleField = zod
  .string()
  .trim()
  .min(1, CONTENT_PAGE_VALIDATION_KEYS.titleRequired)
  .max(CONTENT_PAGE_COLUMN_LENGTH.title, CONTENT_PAGE_VALIDATION_KEYS.titleTooLong)

const descriptionField = zod
  .string()
  .trim()
  .min(1, CONTENT_PAGE_VALIDATION_KEYS.descriptionRequired)
  .max(CONTENT_PAGE_COLUMN_LENGTH.description, CONTENT_PAGE_VALIDATION_KEYS.descriptionTooLong)

const bodyField = zod
  .string()
  .trim()
  .min(1, CONTENT_PAGE_VALIDATION_KEYS.bodyRequired)
  .max(CONTENT_PAGE_COLUMN_LENGTH.body, CONTENT_PAGE_VALIDATION_KEYS.bodyTooLong)
  .refine(hasOnlyPublishableMarkdown, CONTENT_PAGE_VALIDATION_KEYS.bodyUnsupported)

const formValues = zod.object({
  bodies: zod.record(zod.enum(I18N.SUPPORTED_LOCALES), bodyField),
  descriptions: zod.record(zod.enum(I18N.SUPPORTED_LOCALES), descriptionField),
  expectedUpdatedAt: zod.date(),
  titles: zod.record(zod.enum(I18N.SUPPORTED_LOCALES), titleField),
})

export const contentPageZodSchemas = {
  formValues,
  handleInput: zod.object({ handle: handleField }),
  updateInput: formValues.extend({ handle: handleField }),
  viewInput: zod.object({ handle: handleField, locale: localeField }),
}
