import { type z } from "zod/v4"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type contentPage } from "~/src/modules/content-page/content-page.schema"
import { type contentPageZodSchemas } from "~/src/modules/content-page/content-page.zod"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

interface ContentPageView {
  readonly body: string
  readonly description: string
  readonly revisedAt: Date
  readonly title: string
}

export interface ContentPage {
  adminListItem: Pick<ContentPage["select"], "handle" | "titles" | "updatedAt">
  formValues: z.infer<(typeof contentPageZodSchemas)["formValues"]>
  localeMap: ProductAttribute["localeMap"]
  revisionMap: Record<SupportedLocale, number>
  select: typeof contentPage.$inferSelect
  updateInput: z.infer<(typeof contentPageZodSchemas)["updateInput"]>
  view: ContentPageView
}
