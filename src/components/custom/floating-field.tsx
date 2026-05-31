import type { JSX } from "react";

import { Check } from "lucide-react";
import type { ControllerFieldState } from "react-hook-form";

import { cn } from "~/src/lib/utils";

export const FLOATING_LABEL_CLASS = cn(
  "pointer-events-none absolute top-[26px] left-3 z-10 origin-left -translate-y-1/2 text-sm font-normal whitespace-nowrap text-muted-foreground normal-case transition-all duration-200",
  "peer-focus:top-0 peer-focus:text-[10px] peer-focus:font-medium peer-focus:tracking-[0.22em] peer-focus:uppercase",
  "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:tracking-[0.22em] peer-[:not(:placeholder-shown)]:uppercase",
  "peer-aria-[invalid=true]:text-destructive"
);

export const VALID_INPUT_CLASS = "border-success focus-visible:border-success";

export function FloatingLabel({
  className,
  htmlFor,
  label,
  required
}: Readonly<{
  className?: string;
  htmlFor: string;
  label: string;
  required?: boolean;
}>): JSX.Element {
  return (
    <label htmlFor={htmlFor} className={cn(FLOATING_LABEL_CLASS, className)}>
      {label}
      {required === true && <span className="text-muted-foreground/60"> *</span>}
    </label>
  );
}

export function ValidCheck({ className, show }: Readonly<{ className?: string; show: boolean }>): JSX.Element | undefined {
  if (!show) {
    return undefined;
  }
  return (
    <Check
      aria-hidden
      strokeWidth={1.75}
      className={cn("pointer-events-none absolute top-[26px] right-3 size-4 max-w-4 -translate-y-1/2 text-success", className)}
    />
  );
}

export function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// A field shows its "valid" affordance (green border + check) only once the
// user has touched and left it with a non-empty, error-free value.
export function isFieldValid(fieldState: ControllerFieldState, value: string): boolean {
  return fieldState.isTouched && !fieldState.invalid && value !== "";
}
