import { type ChangeEvent, type FocusEvent, type JSX, type KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react"

import { cn } from "cn"

import { STORE_CURRENCY_CODE, type SupportedCurrencyCode } from "~/src/modules/_core/constants/currency"
import {
  formatMinorUnitsToMoneyInput,
  getCurrencyDefinition,
  getExampleMajorAmount,
  isPartialMoneyInput,
  parseMoneyInputToMinorUnits,
  toNumberMoneyInputValue,
} from "~/src/modules/_core/utils/currency"

import { useFormatLocale, useFormatter } from "~/src/hooks/use-display-format"

import { sheetNumberInputNoSpinnerClassName } from "~/src/presentation/components/shadcn/_styles/sheet-control.styles"
import { Input } from "~/src/presentation/components/shadcn/input"

const formatStoredMoneyValue = (value: string, currencyCode: SupportedCurrencyCode, formatLocale: string): string => {
  if (value === EMPTY_VALUE) {
    return EMPTY_VALUE
  }

  return toNumberMoneyInputValue(value, currencyCode, formatLocale)
}

export const CatalogMoneyInput = ({
  "aria-label": ariaLabel,
  ariaInvalid,
  className,
  currencyCode = STORE_CURRENCY_CODE,
  onValueChange,
  value,
}: Readonly<CatalogMoneyInputProps>): JSX.Element => {
  const format = useFormatter()
  const formatLocale = useFormatLocale()
  const { minorUnitExponent } = getCurrencyDefinition(currencyCode)
  const [displayValue, setDisplayValue] = useState(() => formatStoredMoneyValue(value, currencyCode, formatLocale))
  const [isEditing, setIsEditing] = useState(false)
  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(formatStoredMoneyValue(value, currencyCode, formatLocale))
    }
  }, [currencyCode, isEditing, formatLocale, value])

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
      if (next === EMPTY_VALUE || isPartialMoneyInput(next, currencyCode, formatLocale)) {
        setDisplayValue(next)
        onValueChange(next)
      }
    },
    [currencyCode, formatLocale, onValueChange],
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

    const minor = parseMoneyInputToMinorUnits(displayValue, currencyCode, formatLocale)
    if (minor === undefined) {
      const fallback = formatStoredMoneyValue(value, currencyCode, formatLocale)
      setDisplayValue(fallback)
      onValueChange(fallback)

      return
    }

    const formatted = formatMinorUnitsToMoneyInput(minor, currencyCode, formatLocale)
    setDisplayValue(formatted)
    onValueChange(formatted)
  }, [currencyCode, displayValue, formatLocale, onValueChange, value])

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
