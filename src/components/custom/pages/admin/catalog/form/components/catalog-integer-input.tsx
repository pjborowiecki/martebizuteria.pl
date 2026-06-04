import { type ChangeEvent, type FocusEvent, type JSX, type KeyboardEvent, useCallback, useEffect, useState } from "react";

import { cn } from "~/src/lib/utils";

import { Input } from "~/src/components/shadcn/input";

import { CATALOG_SHEET_NUMBER_INPUT_CLASS } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.styles";

const EMPTY_VALUE = "";
const DEFAULT_MIN = 0;
const NON_DIGIT_PATTERN = /\D/gu;
const BLOCKED_INTEGER_INPUT_KEYS = new Set(["e", "E", "+", "-", ".", ","]);

interface CatalogIntegerInputProps {
  readonly "aria-label"?: string;
  readonly ariaInvalid?: boolean;
  readonly className?: string;
  readonly min?: number;
  readonly onValueChange: (value: number) => void;
  readonly placeholder?: string;
  readonly value: number;
}

function sanitizeIntegerInput(raw: string): string {
  return raw.replace(NON_DIGIT_PATTERN, "");
}

function commitIntegerValue(raw: string, min: number): number {
  if (raw === EMPTY_VALUE) {
    return min;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return min;
  }

  return Math.max(min, parsed);
}

/** Whole-number field (`inputMode="numeric"`) — avoids `type="number"` leading-zero and empty→0 races. */
export function CatalogIntegerInput({
  "aria-label": ariaLabel,
  ariaInvalid,
  className,
  min = DEFAULT_MIN,
  onValueChange,
  placeholder,
  value
}: Readonly<CatalogIntegerInputProps>): JSX.Element {
  const [displayValue, setDisplayValue] = useState(() => String(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(String(value));
    }
  }, [isEditing, value]);

  const handleFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
    setIsEditing(true);
    event.currentTarget.select();
  }, []);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(sanitizeIntegerInput(event.target.value));
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const committed = commitIntegerValue(displayValue, min);
    onValueChange(committed);
    setDisplayValue(String(committed));
  }, [displayValue, min, onValueChange]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_INTEGER_INPUT_KEYS.has(event.key)) {
      event.preventDefault();
    }
  }, []);

  return (
    <Input
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      variant="sheet"
      autoComplete="off"
      className={cn("font-mono", CATALOG_SHEET_NUMBER_INPUT_CLASS, className)}
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
  );
}
