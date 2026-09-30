import { type ChangeEvent, type JSX, type KeyboardEvent, useCallback } from "react"

import { cn } from "cn"

import { Input } from "~/src/presentation/components/shadcn/input"
import { sheetNumberInputNoSpinnerClassName } from "~/src/presentation/components/shadcn/sheet-control.styles"

const sanitizeIntegerInput = (raw: string): string => raw.replace(NON_DIGIT_PATTERN, "")

export const CatalogIntegerFilterInput = ({
  "aria-label": ariaLabel,
  className,
  onValueChange,
  placeholder = "0",
  value,
}: Readonly<CatalogIntegerFilterInputProps>): JSX.Element => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onValueChange(sanitizeIntegerInput(event.target.value))
    },
    [onValueChange],
  )

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_INTEGER_INPUT_KEYS.has(event.key)) {
      event.preventDefault()
    }
  }, [])

  return (
    <Input
      aria-label={ariaLabel}
      variant="sheet"
      autoComplete="off"
      className={cn("font-mono", sheetNumberInputNoSpinnerClassName, className)}
      inputMode="numeric"
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      spellCheck={false}
      type="text"
      value={value}
    />
  )
}

const NON_DIGIT_PATTERN = /\D/gu

const BLOCKED_INTEGER_INPUT_KEYS = new Set(["e", "E", "+", "-", ".", ","])

interface CatalogIntegerFilterInputProps {
  readonly "aria-label"?: string
  readonly className?: string
  readonly onValueChange: (value: string) => void
  readonly placeholder?: string
  readonly value: string
}
