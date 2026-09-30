import { type JSX } from "react"

import { DATE_COLUMN_FILTER_OPERATOR, type DateColumnFilterOperator } from "~/src/modules/_core/utils/column-filters"

import { LocaleDatePicker } from "~/src/presentation/components/shadcn/locale-date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

export const AdminDateFilterForm = ({
  draft,
  labels,
  onDateChange,
  onEndDateChange,
  onOperatorChange,
  onStartDateChange,
  operatorOptions,
  todayIso,
}: Readonly<AdminDateFilterFormProps>): JSX.Element => {
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
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">{labels.startDate}</p>
            <LocaleDatePicker
              ariaLabel={labels.startDate}
              clearLabel={labels.clearDate}
              max={draft.endDate === "" ? todayIso : draft.endDate}
              onChange={onStartDateChange}
              placeholder={labels.placeholder}
              todayIso={todayIso}
              todayLabel={labels.today}
              value={draft.startDate}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">{labels.endDate}</p>
            <LocaleDatePicker
              ariaLabel={labels.endDate}
              clearLabel={labels.clearDate}
              min={draft.startDate === "" ? undefined : draft.startDate}
              max={todayIso}
              onChange={onEndDateChange}
              placeholder={labels.placeholder}
              todayIso={todayIso}
              todayLabel={labels.today}
              value={draft.endDate}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">{labels.date}</p>
          <LocaleDatePicker
            ariaLabel={labels.date}
            clearLabel={labels.clearDate}
            max={todayIso}
            onChange={onDateChange}
            placeholder={labels.placeholder}
            todayIso={todayIso}
            todayLabel={labels.today}
            value={draft.date}
          />
        </div>
      )}
    </>
  )
}

export interface DateFilterDraft {
  readonly date: string
  readonly endDate: string
  readonly operator: DateColumnFilterOperator
  readonly startDate: string
}

export interface AdminDateFilterFormLabels {
  readonly clearDate: string
  readonly date: string
  readonly endDate: string
  readonly operator: string
  readonly placeholder: string
  readonly startDate: string
  readonly today: string
}

interface AdminDateFilterFormProps {
  readonly draft: DateFilterDraft
  readonly labels: AdminDateFilterFormLabels
  readonly onDateChange: (isoDate: string) => void
  readonly onEndDateChange: (isoDate: string) => void
  readonly onOperatorChange: (value: string | null) => void
  readonly onStartDateChange: (isoDate: string) => void
  readonly operatorOptions: readonly {
    readonly label: string
    readonly value: DateColumnFilterOperator
  }[]
  readonly todayIso: string
}
