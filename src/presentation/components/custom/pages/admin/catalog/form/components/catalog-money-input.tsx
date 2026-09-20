import { type ChangeEvent, type FocusEvent, type JSX, type KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react"

import { cn } from "cn"
import { useFormatter, useLocale } from "use-intl"

import { STORE_CURRENCY_CODE, type SupportedCurrencyCode } from "~/src/modules/_core/constants/currency"

import {
  formatMinorUnitsToMoneyInput,
  getCurrencyDefinition,
  getExampleMajorAmount,
  isPartialMoneyInput,
  parseMoneyInputToMinorUnits,
  toNumberMoneyInputValue,
} from "~/src/lib/currency"

import { Input } from "~/src/presentation/components/shadcn/input"
import { sheetNumberInputNoSpinnerClassName } from "~/src/presentation/components/shadcn/sheet-control.styles"
const formatStoredMoneyValue = (value: string, currencyCode: SupportedCurrencyCode, locale: string): string => {
  if (value === EMPTY_VALUE) {
    return EMPTY_VALUE
  }
  return toNumberMoneyInputValue(value, currencyCode, locale)
}
/** ISO-currency-aware decimal field (`inputMode="decimal"`) — avoids eager `X.00` formatting while typing. */
export const CatalogMoneyInput = ({
  "aria-label": ariaLabel,
  ariaInvalid,
  className,
  currencyCode = STORE_CURRENCY_CODE,
  onValueChange,
  value,
}: Readonly<CatalogMoneyInputProps>): JSX.Element => {
  const format = useFormatter()
  const locale = useLocale()
  const { minorUnitExponent } = getCurrencyDefinition(currencyCode)
  const [displayValue, setDisplayValue] = useState(() => formatStoredMoneyValue(value, currencyCode, locale))
  const [isEditing, setIsEditing] = useState(false)
  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(formatStoredMoneyValue(value, currencyCode, locale))
    }
  }, [currencyCode, isEditing, locale, value])
  const placeholder = useMemo(() => {
    const example = getExampleMajorAmount(currencyCode)
    return format.number(example, {
      maximumFractionDigits: minorUnitExponent,
      minimumFractionDigits: minorUnitExponent,
    })
  }, [currencyCode, format, minorUnitExponent])
  const handleFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
    setIsEditing(true)
    event.currentTarget.select()
  }, [])
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value
      if (next === EMPTY_VALUE || isPartialMoneyInput(next, currencyCode, locale)) {
        setDisplayValue(next)
        onValueChange(next)
      }
    },
    [currencyCode, locale, onValueChange],
  )
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_MONEY_INPUT_KEYS.has(event.key)) {
      event.preventDefault()
    }
  }, [])
  const handleBlur = useCallback(() => {
    setIsEditing(false)
    if (displayValue === EMPTY_VALUE) {
      onValueChange(EMPTY_VALUE)
      return
    }
    const minor = parseMoneyInputToMinorUnits(displayValue, currencyCode, locale)
    if (minor === undefined) {
      const fallback = formatStoredMoneyValue(value, currencyCode, locale)
      setDisplayValue(fallback)
      onValueChange(fallback)
      return
    }
    const formatted = formatMinorUnitsToMoneyInput(minor, currencyCode, locale)
    setDisplayValue(formatted)
    onValueChange(formatted)
  }, [currencyCode, displayValue, locale, onValueChange, value])
  return (
    <Input
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      variant="sheet"
      autoComplete="off"
      className={cn("font-mono", sheetNumberInputNoSpinnerClassName, className)}
      inputMode="decimal"
      onBlur={handleBlur}
      onChange={handleChange}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      spellCheck={false}
      type="text"
      value={displayValue}
    />
  )
}
const EMPTY_VALUE = ""
const BLOCKED_MONEY_INPUT_KEYS = new Set(["e", "E", "+", "-"])
interface CatalogMoneyInputProps {
  readonly "aria-label"?: string
  readonly ariaInvalid?: boolean
  readonly className?: string
  readonly currencyCode?: SupportedCurrencyCode
  readonly onValueChange: (value: string) => void
  readonly value: string
}
