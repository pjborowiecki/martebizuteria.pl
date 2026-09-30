import {
  DATE_COLUMN_FILTER_OPERATOR,
  DATE_COLUMN_FILTER_OPERATORS,
  type DateColumnFilterOperator,
} from "~/src/modules/_core/utils/column-filters"

export const buildAuditDateTimeFilterLabels = (t: AuditDateTimeFilterTranslate): AuditDateTimeFilterLabels => ({
  apply: t("audit.filter.date.apply"),
  clear: t("audit.filter.date.clear"),
  clearDate: t("audit.filter.date.clearDate"),
  date: t("audit.filter.date.date"),
  endDate: t("audit.filter.date.endDate"),
  endTime: t("audit.filter.date.endTime"),
  operator: t("audit.filter.date.operator"),
  operatorAfter: t("audit.filter.date.operatorAfter"),
  operatorBefore: t("audit.filter.date.operatorBefore"),
  operatorBetween: t("audit.filter.date.operatorBetween"),
  operatorOn: t("audit.filter.date.operatorOn"),
  placeholder: t("audit.filter.date.placeholder"),
  startDate: t("audit.filter.date.startDate"),
  startTime: t("audit.filter.date.startTime"),
  time: t("audit.filter.date.time"),
  timePlaceholder: t("audit.filter.date.timePlaceholder"),
  today: t("audit.filter.date.today"),
})

export const buildAuditDateTimeFilterOperatorOptions = (labels: AuditDateTimeFilterLabels) =>
  DATE_COLUMN_FILTER_OPERATORS.map((operator) => ({
    label: labels[DATE_FILTER_OPERATOR_LABEL_KEY[operator]],
    value: operator,
  }))

const DATE_FILTER_OPERATOR_LABEL_KEY = {
  [DATE_COLUMN_FILTER_OPERATOR.AFTER]: "operatorAfter",
  [DATE_COLUMN_FILTER_OPERATOR.BEFORE]: "operatorBefore",
  [DATE_COLUMN_FILTER_OPERATOR.BETWEEN]: "operatorBetween",
  [DATE_COLUMN_FILTER_OPERATOR.ON]: "operatorOn",
} as const satisfies Record<DateColumnFilterOperator, keyof AuditDateTimeFilterLabels>

export interface AuditDateTimeFilterLabels {
  readonly apply: string
  readonly clear: string
  readonly clearDate: string
  readonly date: string
  readonly endDate: string
  readonly endTime: string
  readonly operator: string
  readonly operatorAfter: string
  readonly operatorBefore: string
  readonly operatorBetween: string
  readonly operatorOn: string
  readonly placeholder: string
  readonly startDate: string
  readonly startTime: string
  readonly time: string
  readonly timePlaceholder: string
  readonly today: string
}

type AuditDateTimeFilterTranslate = (key: string) => string
