import { type JSX } from "react"

import { type useTranslations } from "use-intl"

import { DATE_COLUMN_FILTER_OPERATOR, type DateColumnFilterOperator } from "~/src/lib/admin-column-filters"

import { LocaleDatePicker } from "~/src/presentation/components/shadcn/locale-date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
export const CustomersDateFilterForm = ({
  draft,
  onDateChange,
  onEndDateChange,
  onOperatorChange,
  onStartDateChange,
  operatorOptions,
  t,
  todayIso,
}: Readonly<CustomersDateFilterFormProps>): JSX.Element => {
  const isRangeOperator = draft.operator === DATE_COLUMN_FILTER_OPERATOR.BETWEEN
  const pickerLabels = {
    clear: t("filter.date.clearDate"),
    placeholder: t("filter.date.placeholder"),
    today: t("filter.date.today"),
  }
  return (
    <>
      <div className="space-y-2">
        <p className="text-[11px] text-muted-foreground">{t("filter.date.operator")}</p>
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
            <p className="text-[11px] text-muted-foreground">{t("filter.date.startDate")}</p>
            <LocaleDatePicker
              ariaLabel={t("filter.date.startDate")}
              clearLabel={pickerLabels.clear}
              max={draft.endDate === "" ? todayIso : draft.endDate}
              onChange={onStartDateChange}
              placeholder={pickerLabels.placeholder}
              todayIso={todayIso}
              todayLabel={pickerLabels.today}
              value={draft.startDate}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">{t("filter.date.endDate")}</p>
            <LocaleDatePicker
              ariaLabel={t("filter.date.endDate")}
              clearLabel={pickerLabels.clear}
              min={draft.startDate === "" ? undefined : draft.startDate}
              max={todayIso}
              onChange={onEndDateChange}
              placeholder={pickerLabels.placeholder}
              todayIso={todayIso}
              todayLabel={pickerLabels.today}
              value={draft.endDate}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">{t("filter.date.date")}</p>
          <LocaleDatePicker
            ariaLabel={t("filter.date.date")}
            clearLabel={pickerLabels.clear}
            max={todayIso}
            onChange={onDateChange}
            placeholder={pickerLabels.placeholder}
            todayIso={todayIso}
            todayLabel={pickerLabels.today}
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
interface CustomersDateFilterFormProps {
  readonly draft: DateFilterDraft
  readonly onDateChange: (isoDate: string) => void
  readonly onEndDateChange: (isoDate: string) => void
  readonly onOperatorChange: (value: string | null) => void
  readonly onStartDateChange: (isoDate: string) => void
  readonly operatorOptions: readonly {
    readonly label: string
    readonly value: DateColumnFilterOperator
  }[]
  readonly t: ReturnType<typeof useTranslations<"pages.admin.customers">>
  readonly todayIso: string
}
