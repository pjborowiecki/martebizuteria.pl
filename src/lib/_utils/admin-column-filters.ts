import { isIsoDateString } from "~/src/lib/_utils/iso-date";

export const NUMERIC_COLUMN_FILTER_OPERATOR = {
  BETWEEN: "between",
  EQ: "eq",
  GT: "gt",
  GTE: "gte",
  LT: "lt",
  LTE: "lte"
} as const;

export type NumericColumnFilterOperator = (typeof NUMERIC_COLUMN_FILTER_OPERATOR)[keyof typeof NUMERIC_COLUMN_FILTER_OPERATOR];

export const NUMERIC_COLUMN_FILTER_OPERATORS: readonly NumericColumnFilterOperator[] = [
  NUMERIC_COLUMN_FILTER_OPERATOR.GTE,
  NUMERIC_COLUMN_FILTER_OPERATOR.GT,
  NUMERIC_COLUMN_FILTER_OPERATOR.EQ,
  NUMERIC_COLUMN_FILTER_OPERATOR.LT,
  NUMERIC_COLUMN_FILTER_OPERATOR.LTE,
  NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN
];

export const NUMERIC_COLUMN_FILTER_OPERATOR_SYMBOL: Record<NumericColumnFilterOperator, string> = {
  [NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN]: "↔",
  [NUMERIC_COLUMN_FILTER_OPERATOR.EQ]: "=",
  [NUMERIC_COLUMN_FILTER_OPERATOR.GT]: ">",
  [NUMERIC_COLUMN_FILTER_OPERATOR.GTE]: "≥",
  [NUMERIC_COLUMN_FILTER_OPERATOR.LT]: "<",
  [NUMERIC_COLUMN_FILTER_OPERATOR.LTE]: "≤"
};

export interface NumericColumnFilterValue {
  readonly amountMinorUnits?: number;
  readonly endAmountMinorUnits?: number;
  readonly operator: NumericColumnFilterOperator;
  readonly startAmountMinorUnits?: number;
}

export function isNumericColumnFilterOperator(value: string): value is NumericColumnFilterOperator {
  return value in NUMERIC_COLUMN_FILTER_OPERATOR_SYMBOL;
}

function readNumericFilterAmount(
  record: Record<string, unknown>,
  key: "amountMinorUnits" | "endAmountMinorUnits" | "startAmountMinorUnits"
): number | undefined {
  const fieldValue = record[key];
  return typeof fieldValue === "number" && Number.isFinite(fieldValue) ? fieldValue : undefined;
}

export function isNumericColumnFilterValue(value: unknown): value is NumericColumnFilterValue {
  if (typeof value !== "object" || value === null || !("operator" in value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const operatorValue = record.operator;
  if (typeof operatorValue !== "string" || !isNumericColumnFilterOperator(operatorValue)) {
    return false;
  }

  if (operatorValue === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN) {
    return (
      readNumericFilterAmount(record, "startAmountMinorUnits") !== undefined &&
      readNumericFilterAmount(record, "endAmountMinorUnits") !== undefined
    );
  }

  return readNumericFilterAmount(record, "amountMinorUnits") !== undefined;
}

export const DATE_COLUMN_FILTER_OPERATOR = {
  AFTER: "after",
  BEFORE: "before",
  BETWEEN: "between",
  ON: "on"
} as const;

export type DateColumnFilterOperator = (typeof DATE_COLUMN_FILTER_OPERATOR)[keyof typeof DATE_COLUMN_FILTER_OPERATOR];

export const DATE_COLUMN_FILTER_OPERATORS: readonly DateColumnFilterOperator[] = [
  DATE_COLUMN_FILTER_OPERATOR.ON,
  DATE_COLUMN_FILTER_OPERATOR.BEFORE,
  DATE_COLUMN_FILTER_OPERATOR.AFTER,
  DATE_COLUMN_FILTER_OPERATOR.BETWEEN
];

export const DATE_COLUMN_FILTER_OPERATOR_SYMBOL: Record<DateColumnFilterOperator, string> = {
  [DATE_COLUMN_FILTER_OPERATOR.AFTER]: ">",
  [DATE_COLUMN_FILTER_OPERATOR.BEFORE]: "<",
  [DATE_COLUMN_FILTER_OPERATOR.BETWEEN]: "↔",
  [DATE_COLUMN_FILTER_OPERATOR.ON]: "="
};

export interface DateColumnFilterValue {
  readonly date?: string;
  readonly endDate?: string;
  readonly operator: DateColumnFilterOperator;
  readonly startDate?: string;
}

export function isDateColumnFilterOperator(value: string): value is DateColumnFilterOperator {
  return value in DATE_COLUMN_FILTER_OPERATOR_SYMBOL;
}

function readOptionalStringField(record: Record<string, unknown>, key: "date" | "endDate" | "startDate"): string | undefined {
  const fieldValue = record[key];
  return typeof fieldValue === "string" ? fieldValue : undefined;
}

export function isDateColumnFilterValue(value: unknown): value is DateColumnFilterValue {
  if (typeof value !== "object" || value === null || !("operator" in value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const operatorValue = record.operator;
  if (typeof operatorValue !== "string" || !isDateColumnFilterOperator(operatorValue)) {
    return false;
  }

  if (operatorValue === DATE_COLUMN_FILTER_OPERATOR.BETWEEN) {
    const startDate = readOptionalStringField(record, "startDate");
    const endDate = readOptionalStringField(record, "endDate");
    return startDate !== undefined && isIsoDateString(startDate) && endDate !== undefined && isIsoDateString(endDate);
  }

  const date = readOptionalStringField(record, "date");
  return date !== undefined && isIsoDateString(date);
}
