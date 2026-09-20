import { type JSX, useCallback } from "react"

import { type SupportedCurrencyCode } from "~/src/modules/_core/constants/currency"

import { NUMERIC_COLUMN_FILTER_OPERATOR } from "~/src/lib/admin-column-filters"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { CatalogIntegerFilterInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-integer-filter-input"
import { CatalogMoneyInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-money-input"
import {
  type AdminNumericColumnFilterInputMode,
  type AdminNumericColumnFilterLabels,
  type NumericFilterDraft,
} from "~/src/presentation/components/custom/pages/admin/lib/admin-numeric-column-filter.types"
const AdminNumericFilterAmountInput = ({
  ariaLabel,
  currencyCode,
  inputMode,
  onChange,
  value,
}: Readonly<AdminNumericFilterAmountInputProps>): JSX.Element => {
  if (inputMode === "integer") {
    return <CatalogIntegerFilterInput aria-label={ariaLabel} className="h-9" onValueChange={onChange} value={value} />
  }
  return <CatalogMoneyInput aria-label={ariaLabel} className="h-9" currencyCode={currencyCode} onValueChange={onChange} value={value} />
}
export const AdminNumericColumnFilterForm = ({
  canApply,
  currencyCode,
  draft,
  hasActiveFilter,
  inputMode = "money",
  isRangeOperator,
  labels,
  onAmountChange,
  onApply,
  onClear,
  onEndAmountChange,
  onOperatorChange,
  onStartAmountChange,
  operatorOptions,
}: Readonly<AdminNumericColumnFilterFormProps>): JSX.Element => {
  const handleStartAmountChange = useCallback(
    (startAmount: string) => {
      onStartAmountChange(startAmount)
    },
    [onStartAmountChange],
  )
  const handleEndAmountChange = useCallback(
    (endAmount: string) => {
      onEndAmountChange(endAmount)
    },
    [onEndAmountChange],
  )
  const handleAmountChange = useCallback(
    (amount: string) => {
      onAmountChange(amount)
    },
    [onAmountChange],
  )
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">{labels.startAmount}</p>
            <AdminNumericFilterAmountInput
              ariaLabel={labels.startAmount}
              currencyCode={currencyCode}
              inputMode={inputMode}
              onChange={handleStartAmountChange}
              value={draft.startAmount}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">{labels.endAmount}</p>
            <AdminNumericFilterAmountInput
              ariaLabel={labels.endAmount}
              currencyCode={currencyCode}
              inputMode={inputMode}
              onChange={handleEndAmountChange}
              value={draft.endAmount}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">{labels.amount}</p>
          <AdminNumericFilterAmountInput
            ariaLabel={labels.amount}
            currencyCode={currencyCode}
            inputMode={inputMode}
            onChange={handleAmountChange}
            value={draft.amount}
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        {hasActiveFilter && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            {labels.clear}
          </Button>
        )}
        <Button type="button" size="sm" disabled={!canApply} onClick={onApply}>
          {labels.apply}
        </Button>
      </div>
    </>
  )
}
export const isRangeNumericOperator = (operator: string): boolean => operator === NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN

interface AdminNumericFilterAmountInputProps {
  readonly ariaLabel: string
  readonly currencyCode: SupportedCurrencyCode
  readonly inputMode: AdminNumericColumnFilterInputMode
  readonly onChange: (value: string) => void
  readonly value: string
}
interface AdminNumericColumnFilterFormProps {
  readonly canApply: boolean
  readonly currencyCode: SupportedCurrencyCode
  readonly draft: NumericFilterDraft
  readonly inputMode?: AdminNumericColumnFilterInputMode
  readonly hasActiveFilter: boolean
  readonly isRangeOperator: boolean
  readonly labels: AdminNumericColumnFilterLabels
  readonly onAmountChange: (amount: string) => void
  readonly onApply: () => void
  readonly onClear: () => void
  readonly onEndAmountChange: (endAmount: string) => void
  readonly onOperatorChange: (operator: string | null) => void
  readonly onStartAmountChange: (startAmount: string) => void
  readonly operatorOptions: readonly {
    readonly label: string
    readonly value: string
  }[]
}
