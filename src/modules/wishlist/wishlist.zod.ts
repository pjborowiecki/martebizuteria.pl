import zod from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { idField, localeField } from "~/src/modules/_core/utils/zod-fields"

export const wishlistZodSchemas = {
  listInput: zod.object({ locale: localeField.default(I18N.DEFAULT_LOCALE) }).default({ locale: I18N.DEFAULT_LOCALE }),
  productIdInput: zod.object({
    productId: idField,
  }),
}
