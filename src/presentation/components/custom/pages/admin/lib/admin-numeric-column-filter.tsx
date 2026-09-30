import { type JSX, useCallback, useEffect, useMemo, useState } from "react"

import { type RowData, type Table } from "@tanstack/react-table"
import { ListFilter } from "lucide-react"
import { useLocale } from "use-intl/react"

import { type SupportedCurrencyCode } from "~/src/modules/_core/constants/currency"
import {
  NUMERIC_COLUMN_FILTER_OPERATOR,
  NUMERIC_COLUMN_FILTER_OPERATORS,
  type NumericColumnFilterOperator,
  isNumericColumnFilterOperator,
  isNumericColumnFilterValue,
} from "~/src/modules/_core/utils/column-filters"

import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "~/src/presentation/components/shadcn/popover"

import { type DataGridFeatures } from "~/src/presentation/components/custom/datagrid/lib/data-grid.features"
import { adminColumnFilterTriggerClass } from "~/src/presentation/components/custom/pages/admin/lib/admin-column-filter-trigger"
import {
  AdminNumericColumnFilterForm,
  isRangeNumericOperator,
} from "~/src/presentation/components/custom/pages/admin/lib/admin-numeric-column-filter-form"
import {
  type AdminNumericColumnFilterInputMode,
  type AdminNumericColumnFilterLabels,
  type NumericFilterDraft,
} from "~/src/presentation/components/custom/pages/admin/lib/admin-numeric-column-filter.types"
import {
  type NumericFilterFormatContext,
  formatActiveNumericFilterLabel,
  isNumericFilterDraftValid,
  parseNumericFilterDraftValue,
  toNumericFilterDraft,
} from "~/src/presentation/components/custom/pages/admin/lib/admin-numeric-column-filter.utils"

export const AdminNumericColumnFilter = <TData extends RowData>({
  ariaLabel,
  columnId,
  currencyCode,
  inputMode = "money",
  label,
  labels,
  table,
}: Readonly<AdminNumericColumnFilterProps<TData>>): JSX.Element => {
  const locale = useLocale()
  const formatContext = useMemo<NumericFilterFormatContext>(
    () => ({
      currencyCode,
      inputMode,
      locale,
    }),
    [currencyCode, inputMode, locale],
  )

  const column = table.getColumn(columnId)
  const rawFilter = column?.getFilterValue()
  const activeFilter = isNumericColumnFilterValue(rawFilter) ? rawFilter : undefined
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NumericFilterDraft>(() => toNumericFilterDraft(activeFilter, formatContext))
  useEffect(() => {
    if (open) {
      setDraft(toNumericFilterDraft(activeFilter, formatContext))
    }
  }, [activeFilter, formatContext, open])

  const operatorOptions = useMemo(() => {
    const operatorLabels: Record<NumericColumnFilterOperator, string> = {
      [NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN]: labels.operatorBetween,
      [NUMERIC_COLUMN_FILTER_OPERATOR.EQ]: labels.operatorEq,
      [NUMERIC_COLUMN_FILTER_OPERATOR.GT]: labels.operatorGt,
      [NUMERIC_COLUMN_FILTER_OPERATOR.GTE]: labels.operatorGte,
      [NUMERIC_COLUMN_FILTER_OPERATOR.LT]: labels.operatorLt,
      [NUMERIC_COLUMN_FILTER_OPERATOR.LTE]: labels.operatorLte,
    }

    return NUMERIC_COLUMN_FILTER_OPERATORS.map((operator) => ({
      label: operatorLabels[operator],
      value: operator,
    }))
  }, [labels])

  const canApply = isNumericFilterDraftValid(draft, formatContext)
  const isRangeOperator = isRangeNumericOperator(draft.operator)
  const triggerLabel = useMemo(() => {
    if (activeFilter === undefined) {
      return label
    }

    return formatActiveNumericFilterLabel(activeFilter, formatContext)
  }, [activeFilter, formatContext, label])

  const handleOperatorChange = useCallback((value: string | null) => {
    if (value === null || !isNumericColumnFilterOperator(value)) {
      return
    }
    setDraft((current) => ({
      ...current,
      operator: value,
    }))
  }, [])

  const handleStartAmountChange = useCallback((startAmount: string) => {
    setDraft((current) => ({
      ...current,
      startAmount,
    }))
  }, [])

  const handleEndAmountChange = useCallback((endAmount: string) => {
    setDraft((current) => ({
      ...current,
      endAmount,
    }))
  }, [])

  const handleAmountChange = useCallback((amount: string) => {
    setDraft((current) => ({
      ...current,
      amount,
    }))
  }, [])

  const handleApply = useCallback(() => {
    const filterValue = parseNumericFilterDraftValue(draft, formatContext)
    if (filterValue === undefined) {
      return
    }
    column?.setFilterValue(filterValue)
    table.setPageIndex(0)
    setOpen(false)
  }, [column, draft, formatContext, table])

  const handleClear = useCallback(() => {
    column?.setFilterValue(undefined)
    table.setPageIndex(0)
    setDraft(toNumericFilterDraft(undefined, formatContext))
    setOpen(false)
  }, [column, formatContext, table])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label={ariaLabel} className={adminColumnFilterTriggerClass(activeFilter !== undefined)}>
        <ListFilter className="size-3.5 shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
        <span className="truncate">{triggerLabel}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>{label}</PopoverTitle>
        </PopoverHeader>

        <AdminNumericColumnFilterForm
          canApply={canApply}
          currencyCode={currencyCode}
          draft={draft}
          hasActiveFilter={activeFilter !== undefined}
          inputMode={inputMode}
          isRangeOperator={isRangeOperator}
          labels={labels}
          onAmountChange={handleAmountChange}
          onApply={handleApply}
          onClear={handleClear}
          onEndAmountChange={handleEndAmountChange}
          onOperatorChange={handleOperatorChange}
          onStartAmountChange={handleStartAmountChange}
          operatorOptions={operatorOptions}
        />
      </PopoverContent>
    </Popover>
  )
}

interface AdminNumericColumnFilterProps<TData extends RowData> {
  readonly ariaLabel: string
  readonly columnId: string
  readonly currencyCode: SupportedCurrencyCode
  readonly inputMode?: AdminNumericColumnFilterInputMode
  readonly label: string
  readonly labels: AdminNumericColumnFilterLabels
  readonly table: Table<DataGridFeatures, TData>
}
