import type { NumericColumnFilterOperator } from "~/src/lib/_utils/admin-column-filters";

export interface NumericFilterDraft {
  readonly amount: string;
  readonly endAmount: string;
  readonly operator: NumericColumnFilterOperator;
  readonly startAmount: string;
}

export type AdminNumericColumnFilterInputMode = "integer" | "money";

export interface AdminNumericColumnFilterLabels {
  readonly amount: string;
  readonly apply: string;
  readonly clear: string;
  readonly endAmount: string;
  readonly operator: string;
  readonly operatorBetween: string;
  readonly operatorEq: string;
  readonly operatorGt: string;
  readonly operatorGte: string;
  readonly operatorLt: string;
  readonly operatorLte: string;
  readonly startAmount: string;
}
