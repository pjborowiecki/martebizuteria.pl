import { type ChangeEvent, type FocusEvent, type JSX, type KeyboardEvent, useCallback, useEffect, useState } from "react"

import { cn } from "cn"

import { Input } from "~/src/presentation/components/shadcn/input"
import { sheetNumberInputNoSpinnerClassName } from "~/src/presentation/components/shadcn/sheet-control.styles"
const sanitizeIntegerInput = (raw: string): string => raw.replace(NON_DIGIT_PATTERN, "")

const commitIntegerValue = (raw: string, min: number): number => {
  if (raw === EMPTY_VALUE) {
    return min
  }
  const parsed = Math.trunc(Number(raw))
  if (Number.isNaN(parsed)) {
    return min
  }
  return Math.max(min, parsed)
}
/** Whole-number field (`inputMode="numeric"`) — avoids `type="number"` leading-zero and empty→0 races. */
export const CatalogIntegerInput = ({
  "aria-label": ariaLabel,
  ariaInvalid,
  className,
  min = 0,
  onValueChange,
  placeholder,
  value,
}: Readonly<CatalogIntegerInputProps>): JSX.Element => {
  const [displayValue, setDisplayValue] = useState(() => String(value))
  const [isEditing, setIsEditing] = useState(false)
  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(String(value))
    }
  }, [isEditing, value])
  const handleFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
    setIsEditing(true)
    event.currentTarget.select()
  }, [])
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(sanitizeIntegerInput(event.target.value))
  }, [])
  const handleBlur = useCallback(() => {
    setIsEditing(false)
    const committed = commitIntegerValue(displayValue, min)
    onValueChange(committed)
    setDisplayValue(String(committed))
  }, [displayValue, min, onValueChange])
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_INTEGER_INPUT_KEYS.has(event.key)) {
      event.preventDefault()
    }
  }, [])
  return (
    <Input
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      variant="sheet"
      autoComplete="off"
      className={cn("font-mono", sheetNumberInputNoSpinnerClassName, className)}
      inputMode="numeric"
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
const NON_DIGIT_PATTERN = /\D/gu
const BLOCKED_INTEGER_INPUT_KEYS = new Set(["e", "E", "+", "-", ".", ","])
interface CatalogIntegerInputProps {
  readonly "aria-label"?: string
  readonly ariaInvalid?: boolean
  readonly className?: string
  readonly min?: number
  readonly onValueChange: (value: number) => void
  readonly placeholder?: string
  readonly value: number
}
