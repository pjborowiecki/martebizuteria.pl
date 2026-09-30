import zod from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  DATE_COLUMN_FILTER_OPERATOR,
  type DateColumnFilterValue,
  type NumericColumnFilterValue,
  isDateColumnFilterValue,
  isNumericColumnFilterValue,
} from "~/src/modules/_core/utils/column-filters"
import { type DateTimeColumnFilterValue } from "~/src/modules/_core/utils/datetime-column-filter"
import { LIST_PAGE_FIRST } from "~/src/modules/_core/utils/pagination"

export const MIN_FIELD_LENGTH = 1

export const idField = zod.string().trim().min(MIN_FIELD_LENGTH)

export const uuidField = zod.uuid()

export const handleField = zod.string().trim().min(MIN_FIELD_LENGTH)

export const localeField = zod.enum(I18N.SUPPORTED_LOCALES)

export const searchTermField = zod.string()

export const pageField = zod.number().int().min(LIST_PAGE_FIRST)

export const pageSizeField = zod.number().int().min(MIN_FIELD_LENGTH)

export const dateColumnFilterField = zod.custom<DateColumnFilterValue>(isDateColumnFilterValue)

export const numericColumnFilterField = zod.custom<NumericColumnFilterValue>(isNumericColumnFilterValue)

const dateTimeColumnFilterShape = zod.object({
  date: zod.string().optional(),
  endDate: zod.string().optional(),
  operator: zod.enum(DATE_COLUMN_FILTER_OPERATOR),
  startDate: zod.string().optional(),
})

export const dateTimeColumnFilterField = zod.custom<DateTimeColumnFilterValue>(
  (value) => dateTimeColumnFilterShape.safeParse(value).success,
)
