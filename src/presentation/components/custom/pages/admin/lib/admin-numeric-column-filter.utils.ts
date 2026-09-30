import { type SupportedCurrencyCode } from "~/src/modules/_core/constants/currency"
import {
  NUMERIC_COLUMN_FILTER_OPERATOR,
  NUMERIC_COLUMN_FILTER_OPERATOR_SYMBOL,
  type NumericColumnFilterValue,
} from "~/src/modules/_core/utils/column-filters"
import { formatMinorUnitsToMoneyInput, parseMoneyInputToMinorUnits } from "~/src/modules/_core/utils/currency"

import {
  type AdminNumericColumnFilterInputMode,
  type NumericFilterDraft,
} from "~/src/presentation/components/custom/pages/admin/lib/admin-numeric-column-filter.types"

const parseIntegerInput = (value: string): number | undefined => {
  const trimmed = value.trim()
  if (!/^\d+$/u.test(trimmed)) {
    return undefined
  }

  const parsed = Number(trimmed)
  if (!Number.isSafeInteger(parsed)) {
    return undefined
  }

  return parsed
}

const formatDraftAmount = (minorUnits: number, context: NumericFilterFormatContext): string =>
  context.inputMode === "integer" ? String(minorUnits) : formatMinorUnitsToMoneyInput(minorUnits, context.currencyCode, context.locale)

export const toNumericFilterDraft = (
  filter: NumericColumnFilterValue | undefined,
  context: NumericFilterFormatContext,
): NumericFilterDraft => {
  if (filter === undefined) {
    return {
      amount: "",
      endAmount: "",
      operator: DEFAULT_OPERATOR,
      startAmount: "",
    }
  }

  if (filter.operator === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN) {
    return {
      amount: "",
      endAmount: formatDraftAmount(filter.endAmountMinorUnits ?? DEFAULT_MINOR_UNITS, context),
      operator: filter.operator,
      startAmount: formatDraftAmount(filter.startAmountMinorUnits ?? DEFAULT_MINOR_UNITS, context),
    }
  }

  return {
    amount: formatDraftAmount(filter.amountMinorUnits ?? DEFAULT_MINOR_UNITS, context),
    endAmount: "",
    operator: filter.operator,
    startAmount: "",
  }
}

const isIntegerDraftValid = (draft: NumericFilterDraft): boolean => {
  if (draft.operator === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN) {
    return parseIntegerInput(draft.startAmount) !== undefined && parseIntegerInput(draft.endAmount) !== undefined
  }

  return draft.amount.trim() !== "" && parseIntegerInput(draft.amount) !== undefined
}

const isMoneyDraftValid = (draft: NumericFilterDraft, context: NumericFilterFormatContext): boolean => {
  if (draft.operator === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN) {
    return (
      parseMoneyInputToMinorUnits(draft.startAmount, context.currencyCode, context.locale) !== undefined &&
      parseMoneyInputToMinorUnits(draft.endAmount, context.currencyCode, context.locale) !== undefined
    )
  }

  return draft.amount.trim() !== "" && parseMoneyInputToMinorUnits(draft.amount, context.currencyCode, context.locale) !== undefined
}

export const isNumericFilterDraftValid = (draft: NumericFilterDraft, context: NumericFilterFormatContext): boolean =>
  context.inputMode === "integer" ? isIntegerDraftValid(draft) : isMoneyDraftValid(draft, context)

const parseIntegerDraftValue = (draft: NumericFilterDraft): NumericColumnFilterValue | undefined => {
  if (draft.operator === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN) {
    const startAmountMinorUnits = parseIntegerInput(draft.startAmount)
    const endAmountMinorUnits = parseIntegerInput(draft.endAmount)
    if (startAmountMinorUnits === undefined || endAmountMinorUnits === undefined) {
      return undefined
    }

    return {
      endAmountMinorUnits,
      operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN,
      startAmountMinorUnits,
    }
  }

  const amountMinorUnits = parseIntegerInput(draft.amount)
  if (amountMinorUnits === undefined) {
    return undefined
  }

  return {
    amountMinorUnits,
    operator: draft.operator,
  }
}

const parseMoneyDraftValue = (draft: NumericFilterDraft, context: NumericFilterFormatContext): NumericColumnFilterValue | undefined => {
  if (draft.operator === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN) {
    const startAmountMinorUnits = parseMoneyInputToMinorUnits(draft.startAmount, context.currencyCode, context.locale)
    const endAmountMinorUnits = parseMoneyInputToMinorUnits(draft.endAmount, context.currencyCode, context.locale)
    if (startAmountMinorUnits === undefined || endAmountMinorUnits === undefined) {
      return undefined
    }

    return {
      endAmountMinorUnits,
      operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN,
      startAmountMinorUnits,
    }
  }

  const amountMinorUnits = parseMoneyInputToMinorUnits(draft.amount, context.currencyCode, context.locale)
  if (amountMinorUnits === undefined) {
    return undefined
  }

  return {
    amountMinorUnits,
    operator: draft.operator,
  }
}

export const parseNumericFilterDraftValue = (
  draft: NumericFilterDraft,
  context: NumericFilterFormatContext,
): NumericColumnFilterValue | undefined =>
  context.inputMode === "integer" ? parseIntegerDraftValue(draft) : parseMoneyDraftValue(draft, context)

export const formatActiveNumericFilterLabel = (filter: NumericColumnFilterValue, context: NumericFilterFormatContext): string => {
  if (filter.operator === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN) {
    const start = formatDraftAmount(filter.startAmountMinorUnits ?? DEFAULT_MINOR_UNITS, context)
    const end = formatDraftAmount(filter.endAmountMinorUnits ?? DEFAULT_MINOR_UNITS, context)

    return `${NUMERIC_COLUMN_FILTER_OPERATOR_SYMBOL[NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN]} ${start} – ${end}`
  }

  return `${NUMERIC_COLUMN_FILTER_OPERATOR_SYMBOL[filter.operator]} ${formatDraftAmount(filter.amountMinorUnits ?? DEFAULT_MINOR_UNITS, context)}`
}

const DEFAULT_MINOR_UNITS = 0

const DEFAULT_OPERATOR = NUMERIC_COLUMN_FILTER_OPERATOR.GTE

export interface NumericFilterFormatContext {
  readonly currencyCode: SupportedCurrencyCode
  readonly inputMode?: AdminNumericColumnFilterInputMode
  readonly locale: string
}
