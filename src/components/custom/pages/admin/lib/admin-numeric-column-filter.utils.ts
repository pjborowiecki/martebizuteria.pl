import type { SupportedCurrencyCode } from "~/src/constants/_constants/currency";

import {
  NUMERIC_COLUMN_FILTER_OPERATOR,
  NUMERIC_COLUMN_FILTER_OPERATOR_SYMBOL,
  type NumericColumnFilterValue
} from "~/src/lib/_utils/admin-column-filters";
import { formatMinorUnitsToMoneyInput, parseMoneyInputToMinorUnits } from "~/src/lib/utils";

import type {
  AdminNumericColumnFilterInputMode,
  NumericFilterDraft
} from "~/src/components/custom/pages/admin/lib/admin-numeric-column-filter.types";

const DEFAULT_MINOR_UNITS = 0;
const DEFAULT_OPERATOR = NUMERIC_COLUMN_FILTER_OPERATOR.GTE;
const INTEGER_RADIX = 10;

export interface NumericFilterFormatContext {
  readonly currencyCode: SupportedCurrencyCode;
  readonly inputMode?: AdminNumericColumnFilterInputMode;
  readonly locale: string;
}

function parseIntegerInput(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, INTEGER_RADIX);
  if (!Number.isFinite(parsed) || parsed < DEFAULT_MINOR_UNITS) {
    return undefined;
  }

  return parsed;
}

function formatDraftAmount(minorUnits: number, context: NumericFilterFormatContext): string {
  return context.inputMode === "integer"
    ? String(minorUnits)
    : formatMinorUnitsToMoneyInput(minorUnits, context.currencyCode, context.locale);
}

export function toNumericFilterDraft(
  filter: NumericColumnFilterValue | undefined,
  context: NumericFilterFormatContext
): NumericFilterDraft {
  if (filter === undefined) {
    return { amount: "", endAmount: "", operator: DEFAULT_OPERATOR, startAmount: "" };
  }

  if (filter.operator === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN) {
    return {
      amount: "",
      endAmount: formatDraftAmount(filter.endAmountMinorUnits ?? DEFAULT_MINOR_UNITS, context),
      operator: filter.operator,
      startAmount: formatDraftAmount(filter.startAmountMinorUnits ?? DEFAULT_MINOR_UNITS, context)
    };
  }

  return {
    amount: formatDraftAmount(filter.amountMinorUnits ?? DEFAULT_MINOR_UNITS, context),
    endAmount: "",
    operator: filter.operator,
    startAmount: ""
  };
}

function isIntegerDraftValid(draft: NumericFilterDraft): boolean {
  if (draft.operator === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN) {
    return parseIntegerInput(draft.startAmount) !== undefined && parseIntegerInput(draft.endAmount) !== undefined;
  }

  return draft.amount.trim() !== "" && parseIntegerInput(draft.amount) !== undefined;
}

function isMoneyDraftValid(draft: NumericFilterDraft, context: NumericFilterFormatContext): boolean {
  if (draft.operator === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN) {
    return (
      parseMoneyInputToMinorUnits(draft.startAmount, context.currencyCode, context.locale) !== undefined &&
      parseMoneyInputToMinorUnits(draft.endAmount, context.currencyCode, context.locale) !== undefined
    );
  }

  return draft.amount.trim() !== "" && parseMoneyInputToMinorUnits(draft.amount, context.currencyCode, context.locale) !== undefined;
}

export function isNumericFilterDraftValid(draft: NumericFilterDraft, context: NumericFilterFormatContext): boolean {
  return context.inputMode === "integer" ? isIntegerDraftValid(draft) : isMoneyDraftValid(draft, context);
}

function parseIntegerDraftValue(draft: NumericFilterDraft): NumericColumnFilterValue | undefined {
  if (draft.operator === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN) {
    const startAmountMinorUnits = parseIntegerInput(draft.startAmount);
    const endAmountMinorUnits = parseIntegerInput(draft.endAmount);
    if (startAmountMinorUnits === undefined || endAmountMinorUnits === undefined) {
      return undefined;
    }

    return {
      endAmountMinorUnits,
      operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN,
      startAmountMinorUnits
    };
  }

  const amountMinorUnits = parseIntegerInput(draft.amount);
  if (amountMinorUnits === undefined) {
    return undefined;
  }

  return { amountMinorUnits, operator: draft.operator };
}

function parseMoneyDraftValue(draft: NumericFilterDraft, context: NumericFilterFormatContext): NumericColumnFilterValue | undefined {
  if (draft.operator === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN) {
    const startAmountMinorUnits = parseMoneyInputToMinorUnits(draft.startAmount, context.currencyCode, context.locale);
    const endAmountMinorUnits = parseMoneyInputToMinorUnits(draft.endAmount, context.currencyCode, context.locale);
    if (startAmountMinorUnits === undefined || endAmountMinorUnits === undefined) {
      return undefined;
    }

    return {
      endAmountMinorUnits,
      operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN,
      startAmountMinorUnits
    };
  }

  const amountMinorUnits = parseMoneyInputToMinorUnits(draft.amount, context.currencyCode, context.locale);
  if (amountMinorUnits === undefined) {
    return undefined;
  }

  return { amountMinorUnits, operator: draft.operator };
}

export function parseNumericFilterDraftValue(
  draft: NumericFilterDraft,
  context: NumericFilterFormatContext
): NumericColumnFilterValue | undefined {
  return context.inputMode === "integer" ? parseIntegerDraftValue(draft) : parseMoneyDraftValue(draft, context);
}

function formatTriggerAmount(minorUnits: number, context: NumericFilterFormatContext): string {
  return formatDraftAmount(minorUnits, context);
}

export function formatActiveNumericFilterLabel(filter: NumericColumnFilterValue, context: NumericFilterFormatContext): string {
  if (filter.operator === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN) {
    const start = formatTriggerAmount(filter.startAmountMinorUnits ?? DEFAULT_MINOR_UNITS, context);
    const end = formatTriggerAmount(filter.endAmountMinorUnits ?? DEFAULT_MINOR_UNITS, context);
    return `${NUMERIC_COLUMN_FILTER_OPERATOR_SYMBOL[NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN]} ${start} – ${end}`;
  }

  return `${NUMERIC_COLUMN_FILTER_OPERATOR_SYMBOL[filter.operator]} ${formatTriggerAmount(filter.amountMinorUnits ?? DEFAULT_MINOR_UNITS, context)}`;
}
