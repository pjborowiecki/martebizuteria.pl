import { type ChangeEvent, type JSX, type KeyboardEvent, useCallback } from "react";

import { cn } from "~/src/lib/utils";

import { Input } from "~/src/components/shadcn/input";

import { CATALOG_SHEET_NUMBER_INPUT_CLASS } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.styles";

const NON_DIGIT_PATTERN = /\D/gu;
const BLOCKED_INTEGER_INPUT_KEYS = new Set(["e", "E", "+", "-", ".", ","]);

interface CatalogIntegerFilterInputProps {
  readonly "aria-label"?: string;
  readonly className?: string;
  readonly onValueChange: (value: string) => void;
  readonly placeholder?: string;
  readonly value: string;
}

function sanitizeIntegerInput(raw: string): string {
  return raw.replace(NON_DIGIT_PATTERN, "");
}

/** Whole-number string field for filter popovers — matches `CatalogMoneyInput` sheet styling. */
export function CatalogIntegerFilterInput({
  "aria-label": ariaLabel,
  className,
  onValueChange,
  placeholder = "0",
  value
}: Readonly<CatalogIntegerFilterInputProps>): JSX.Element {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onValueChange(sanitizeIntegerInput(event.target.value));
    },
    [onValueChange]
  );

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_INTEGER_INPUT_KEYS.has(event.key)) {
      event.preventDefault();
    }
  }, []);

  return (
    <Input
      aria-label={ariaLabel}
      variant="sheet"
      autoComplete="off"
      className={cn("font-mono", CATALOG_SHEET_NUMBER_INPUT_CLASS, className)}
      inputMode="numeric"
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      spellCheck={false}
      type="text"
      value={value}
    />
  );
}
