import { type JSX } from "react"

import { cn } from "cn"
import { Check } from "lucide-react"
import { type ControllerFieldState } from "react-hook-form"

export const FLOATING_LABEL_CLASS = cn(
  "pointer-events-none absolute top-[26px] left-3 z-10 origin-left -translate-y-1/2 text-sm font-normal whitespace-nowrap text-muted-foreground normal-case transition-all duration-200",
  "peer-focus:top-0 peer-focus:text-[10px] peer-focus:font-medium peer-focus:tracking-[0.22em] peer-focus:uppercase",
  "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:tracking-[0.22em] peer-[:not(:placeholder-shown)]:uppercase",
  "peer-aria-[invalid=true]:text-destructive",
)

export const VALID_INPUT_CLASS = "border-success focus-visible:border-success"

export const FloatingLabel = ({
  className,
  htmlFor,
  label,
  required,
}: Readonly<{
  className?: string
  htmlFor: string
  label: string
  required?: boolean | undefined
}>): JSX.Element => (
  <label htmlFor={htmlFor} className={cn(FLOATING_LABEL_CLASS, className)}>
    {label}
    {required === true && <span className="text-muted-foreground/60"> *</span>}
  </label>
)

export const ValidCheck = ({ className, show }: Readonly<{ className?: string; show: boolean }>): JSX.Element | undefined => {
  if (!show) {
    return undefined
  }

  return (
    <Check
      aria-hidden
      strokeWidth={1.75}
      className={cn("pointer-events-none absolute top-[26px] right-3 size-4 max-w-4 -translate-y-1/2 text-success", className)}
    />
  )
}

export const toStringValue = (value: unknown): string => (typeof value === "string" ? value : "")

export const isFieldValid = (fieldState: ControllerFieldState, value: string): boolean =>
  fieldState.isTouched && !fieldState.invalid && value !== ""
