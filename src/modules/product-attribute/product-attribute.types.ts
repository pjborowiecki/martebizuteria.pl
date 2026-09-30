import { type z } from "zod/v4"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type productAttribute } from "~/src/modules/product-attribute/product-attribute.schema"
import { type productAttributeZodSchemas } from "~/src/modules/product-attribute/product-attribute.zod"

type LocaleCode = SupportedLocale

type LocaleMap = Record<LocaleCode, string>

interface AllowedValue {
  readonly labels: LocaleMap
  readonly value: string
}

export interface ProductAttribute {
  adminListItem: z.infer<(typeof productAttributeZodSchemas)["adminListItem"]>
  allowedValue: AllowedValue
  formValues: z.infer<(typeof productAttributeZodSchemas)["createInput"]>
  insert: typeof productAttribute.$inferInsert
  localeCode: LocaleCode
  localeMap: LocaleMap
  select: typeof productAttribute.$inferSelect
  stats: z.infer<(typeof productAttributeZodSchemas)["stats"]>
}
