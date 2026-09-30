import {
  DATE_COLUMN_FILTER_OPERATOR,
  DATE_COLUMN_FILTER_OPERATOR_SYMBOL,
  type DateColumnFilterOperator,
} from "~/src/modules/_core/utils/column-filters"
import { isIsoDateString } from "~/src/modules/_core/utils/iso-date"
import {
  combineIsoDateAndTime,
  isIsoDateTimeLocalString,
  isTimeInputValue,
  parseIsoDateTimeLocalToMs,
  splitIsoDateTimeLocal,
} from "~/src/modules/_core/utils/iso-datetime"

export const formatDateTimeFilterTriggerLabel = ({
  activeFilter,
  formatIsoDateTimeLabel,
  idleLabel,
}: FormatDateTimeFilterTriggerLabelInput): string => {
  if (activeFilter === undefined) {
    return idleLabel
  }

  if (
    activeFilter.operator === DATE_COLUMN_FILTER_OPERATOR.BETWEEN &&
    activeFilter.startDate !== undefined &&
    activeFilter.endDate !== undefined
  ) {
    return `${formatIsoDateTimeLabel(activeFilter.startDate)} – ${formatIsoDateTimeLabel(activeFilter.endDate)}`
  }

  if (activeFilter.date === undefined) {
    return idleLabel
  }

  return `${DATE_COLUMN_FILTER_OPERATOR_SYMBOL[activeFilter.operator]} ${formatIsoDateTimeLabel(activeFilter.date)}`
}

export const isDateTimeFilterRangeValid = (startDateTime: string, endDateTime: string): boolean => {
  if (!isIsoDateTimeLocalString(startDateTime) || !isIsoDateTimeLocalString(endDateTime)) {
    return false
  }

  return parseIsoDateTimeLocalToMs(startDateTime) <= parseIsoDateTimeLocalToMs(endDateTime)
}

export const emptyDateTimeFilterDraft = (operator: DateColumnFilterOperator = DATE_COLUMN_FILTER_OPERATOR.ON): DateTimeFilterDraft => ({
  date: "",
  endDate: "",
  endTime: "",
  operator,
  startDate: "",
  startTime: "",
  time: "",
})

export const dateTimeFilterDraftFromValue = (filter: DateTimeColumnFilterValue | undefined): DateTimeFilterDraft => {
  if (filter === undefined) {
    return emptyDateTimeFilterDraft()
  }

  if (filter.operator === DATE_COLUMN_FILTER_OPERATOR.BETWEEN) {
    const start = splitIsoDateTimeLocal(filter.startDate ?? "")
    const end = splitIsoDateTimeLocal(filter.endDate ?? "")

    return {
      date: "",
      endDate: end.date,
      endTime: end.time,
      operator: filter.operator,
      startDate: start.date,
      startTime: start.time,
      time: "",
    }
  }

  const single = splitIsoDateTimeLocal(filter.date ?? "")

  return {
    date: single.date,
    endDate: "",
    endTime: "",
    operator: filter.operator,
    startDate: "",
    startTime: "",
    time: single.time,
  }
}

export const dateTimeFilterValueFromDraft = (draft: DateTimeFilterDraft): DateTimeColumnFilterValue => {
  if (draft.operator === DATE_COLUMN_FILTER_OPERATOR.BETWEEN) {
    return {
      endDate: combineIsoDateAndTime(draft.endDate, draft.endTime),
      operator: draft.operator,
      startDate: combineIsoDateAndTime(draft.startDate, draft.startTime),
    }
  }

  return {
    date: combineIsoDateAndTime(draft.date, draft.time),
    operator: draft.operator,
  }
}

export const isDateTimeFilterDraftValid = (draft: DateTimeFilterDraft): boolean => {
  if (draft.operator === DATE_COLUMN_FILTER_OPERATOR.BETWEEN) {
    if (!isIsoDateString(draft.startDate) || !isIsoDateString(draft.endDate)) {
      return false
    }

    if (!isTimeInputValue(draft.startTime) || !isTimeInputValue(draft.endTime)) {
      return false
    }

    return isDateTimeFilterRangeValid(
      combineIsoDateAndTime(draft.startDate, draft.startTime),
      combineIsoDateAndTime(draft.endDate, draft.endTime),
    )
  }

  if (!isIsoDateString(draft.date)) {
    return false
  }

  return isTimeInputValue(draft.time)
}

export interface DateTimeColumnFilterValue {
  readonly date?: string
  readonly endDate?: string
  readonly operator: DateColumnFilterOperator
  readonly startDate?: string
}

interface FormatDateTimeFilterTriggerLabelInput {
  readonly activeFilter: DateTimeColumnFilterValue | undefined
  readonly formatIsoDateTimeLabel: (isoDateTime: string) => string
  readonly idleLabel: string
}

export interface DateTimeFilterDraft {
  readonly date: string
  readonly endDate: string
  readonly endTime: string
  readonly operator: DateColumnFilterOperator
  readonly startDate: string
  readonly startTime: string
  readonly time: string
}
