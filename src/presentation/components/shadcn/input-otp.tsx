import { type ComponentProps, type JSX, useContext } from "react"

import { cn } from "cn"
import { type OTPInputProps as BaseOTPInputProps, OTPInput, OTPInputContext } from "input-otp"
import { MinusIcon } from "lucide-react"
const InputOTP = ({ className, containerClassName, ...props }: Readonly<InputOTPProps>): JSX.Element => (
  <OTPInput
    className={cn("disabled:cursor-not-allowed", className)}
    containerClassName={cn("cn-input-otp flex items-center has-disabled:opacity-50", containerClassName)}
    data-slot="input-otp"
    spellCheck={false}
    {...props}
  />
)

const InputOTPGroup = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div
    className={cn(
      "flex items-center overflow-hidden rounded-lg has-aria-invalid:border-destructive has-aria-invalid:ring-1 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40",
      className,
    )}
    data-slot="input-otp-group"
    {...props}
  />
)

const InputOTPSlot = ({ className, index, ...props }: Readonly<InputOTPSlotProps>): JSX.Element => {
  const inputOTPContext = useContext(OTPInputContext)
  const slot = inputOTPContext.slots[index]
  const char = slot?.char
  const hasFakeCaret = slot?.hasFakeCaret
  const isActive = slot?.isActive
  return (
    <div
      className={cn(
        "relative flex size-8 items-center justify-center border-y border-r border-input text-xs transition-all outline-none first:border-l aria-invalid:border-destructive data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-1 data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20 dark:bg-input/30 dark:data-[active=true]:aria-invalid:ring-destructive/40",
        className,
      )}
      data-active={isActive}
      data-slot="input-otp-slot"
      {...props}
    >
      {char}
      {hasFakeCaret === true && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  )
}
const InputOTPSeparator = ({ ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div aria-hidden="true" className="flex items-center [&_svg:not([class*='size-'])]:size-4" data-slot="input-otp-separator" {...props}>
    <MinusIcon />
  </div>
)

type InputOTPProps = BaseOTPInputProps & {
  readonly containerClassName?: string
}
interface InputOTPSlotProps extends ComponentProps<"div"> {
  readonly index: number
}
export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot }
