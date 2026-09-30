import { type JSX } from "react"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "cn"

const Progress = ({ className, children, value, ...props }: Readonly<ProgressPrimitive.Root.Props>): JSX.Element => (
  <ProgressPrimitive.Root value={value} data-slot="progress" className={cn("flex flex-wrap gap-3", className)} {...props}>
    {children}
    <ProgressTrack>
      <ProgressIndicator />
    </ProgressTrack>
  </ProgressPrimitive.Root>
)

const ProgressTrack = ({ className, ...props }: Readonly<ProgressPrimitive.Track.Props>): JSX.Element => (
  <ProgressPrimitive.Track
    className={cn("relative flex h-1 w-full items-center overflow-x-hidden rounded-lg bg-muted", className)}
    data-slot="progress-track"
    {...props}
  />
)

const ProgressIndicator = ({ className, ...props }: Readonly<ProgressPrimitive.Indicator.Props>): JSX.Element => (
  <ProgressPrimitive.Indicator data-slot="progress-indicator" className={cn("h-full bg-primary transition-all", className)} {...props} />
)

const ProgressLabel = ({ className, ...props }: Readonly<ProgressPrimitive.Label.Props>): JSX.Element => (
  <ProgressPrimitive.Label className={cn("text-xs", className)} data-slot="progress-label" {...props} />
)

const ProgressValue = ({ className, ...props }: Readonly<ProgressPrimitive.Value.Props>): JSX.Element => (
  <ProgressPrimitive.Value
    className={cn("ml-auto text-xs text-muted-foreground tabular-nums", className)}
    data-slot="progress-value"
    {...props}
  />
)

export { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue }
