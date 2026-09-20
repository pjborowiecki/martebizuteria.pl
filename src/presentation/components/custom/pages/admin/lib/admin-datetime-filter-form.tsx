import { type JSX } from "react"

import { DATE_COLUMN_FILTER_OPERATOR, type DateColumnFilterOperator } from "~/src/lib/admin-column-filters"
import { type DateTimeFilterDraft } from "~/src/lib/admin-datetime-filter"

import { LocaleDatePicker } from "~/src/presentation/components/shadcn/locale-date-picker"
import { LocaleTimePicker } from "~/src/presentation/components/shadcn/locale-time-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
const DateTimeField = ({
  ariaLabel,
  clearLabel,
  date,
  dateLabel,
  max,
  min,
  onDateChange,
  onTimeChange,
  placeholder,
  time,
  timeLabel,
  timePlaceholder,
  todayIso,
  todayLabel,
}: Readonly<{
  readonly ariaLabel: string
  readonly clearLabel: string
  readonly date: string
  readonly dateLabel: string
  readonly max?: string | undefined
  readonly min?: string | undefined
  readonly onDateChange: (isoDate: string) => void
  readonly onTimeChange: (time: string) => void
  readonly placeholder: string
  readonly time: string
  readonly timeLabel: string
  readonly timePlaceholder: string
  readonly todayIso: string
  readonly todayLabel: string
}>): JSX.Element => (
  <div className="grid gap-2">
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">{dateLabel}</p>
      <LocaleDatePicker
        ariaLabel={ariaLabel}
        clearLabel={clearLabel}
        max={max}
        min={min}
        onChange={onDateChange}
        placeholder={placeholder}
        todayIso={todayIso}
        todayLabel={todayLabel}
        value={date}
      />
    </div>
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">{timeLabel}</p>
      <LocaleTimePicker ariaLabel={timeLabel} onChange={onTimeChange} placeholder={timePlaceholder} value={time} />
    </div>
  </div>
)

export const AdminDateTimeFilterForm = ({
  draft,
  labels,
  onDateChange,
  onEndDateChange,
  onEndTimeChange,
  onOperatorChange,
  onStartDateChange,
  onStartTimeChange,
  onTimeChange,
  operatorOptions,
  todayIso,
}: Readonly<AdminDateTimeFilterFormProps>): JSX.Element => {
  const isRangeOperator = draft.operator === DATE_COLUMN_FILTER_OPERATOR.BETWEEN
  return (
    <>
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">{labels.operator}</p>
        <Select items={operatorOptions} value={draft.operator} onValueChange={onOperatorChange}>
          <SelectTrigger size="sm" className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operatorOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isRangeOperator ? (
        <div className="grid gap-3">
          <DateTimeField
            ariaLabel={labels.startDate}
            clearLabel={labels.clearDate}
            date={draft.startDate}
            dateLabel={labels.startDate}
            max={draft.endDate === "" ? todayIso : draft.endDate}
            onDateChange={onStartDateChange}
            onTimeChange={onStartTimeChange}
            placeholder={labels.placeholder}
            time={draft.startTime}
            timeLabel={labels.startTime}
            timePlaceholder={labels.timePlaceholder}
            todayIso={todayIso}
            todayLabel={labels.today}
          />
          <DateTimeField
            ariaLabel={labels.endDate}
            clearLabel={labels.clearDate}
            date={draft.endDate}
            dateLabel={labels.endDate}
            min={draft.startDate === "" ? undefined : draft.startDate}
            max={todayIso}
            onDateChange={onEndDateChange}
            onTimeChange={onEndTimeChange}
            placeholder={labels.placeholder}
            time={draft.endTime}
            timeLabel={labels.endTime}
            timePlaceholder={labels.timePlaceholder}
            todayIso={todayIso}
            todayLabel={labels.today}
          />
        </div>
      ) : (
        <DateTimeField
          ariaLabel={labels.date}
          clearLabel={labels.clearDate}
          date={draft.date}
          dateLabel={labels.date}
          max={todayIso}
          onDateChange={onDateChange}
          onTimeChange={onTimeChange}
          placeholder={labels.placeholder}
          time={draft.time}
          timeLabel={labels.time}
          timePlaceholder={labels.timePlaceholder}
          todayIso={todayIso}
          todayLabel={labels.today}
        />
      )}
    </>
  )
}
export interface AdminDateTimeFilterFormLabels {
  readonly clearDate: string
  readonly date: string
  readonly endDate: string
  readonly endTime: string
  readonly operator: string
  readonly placeholder: string
  readonly startDate: string
  readonly startTime: string
  readonly time: string
  readonly timePlaceholder: string
  readonly today: string
}
interface AdminDateTimeFilterFormProps {
  readonly draft: DateTimeFilterDraft
  readonly labels: AdminDateTimeFilterFormLabels
  readonly onDateChange: (isoDate: string) => void
  readonly onEndDateChange: (isoDate: string) => void
  readonly onEndTimeChange: (time: string) => void
  readonly onOperatorChange: (value: string | null) => void
  readonly onStartDateChange: (isoDate: string) => void
  readonly onStartTimeChange: (time: string) => void
  readonly onTimeChange: (time: string) => void
  readonly operatorOptions: readonly {
    readonly label: string
    readonly value: DateColumnFilterOperator
  }[]
  readonly todayIso: string
}
