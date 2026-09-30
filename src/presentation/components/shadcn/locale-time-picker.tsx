import { type JSX, useCallback, useMemo, useState } from "react"

import { cn } from "cn"
import { Clock3 } from "lucide-react"

import { isTimeInputValue } from "~/src/modules/_core/utils/iso-datetime"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

const buildTimePartOptions = (
  count: number,
): readonly {
  readonly label: string
  readonly value: string
}[] =>
  Array.from(
    {
      length: count,
    },
    (_, index) => {
      const part = String(index).padStart(TIME_PART_WIDTH, "0")

      return {
        label: part,
        value: part,
      }
    },
  )

const splitTimeValue = (
  value: string,
): {
  readonly hours: string
  readonly minutes: string
} => {
  if (!isTimeInputValue(value)) {
    return {
      hours: DEFAULT_HOUR,
      minutes: DEFAULT_MINUTE,
    }
  }

  const [hours = DEFAULT_HOUR, minutes = DEFAULT_MINUTE] = value.split(":")

  return {
    hours,
    minutes,
  }
}

export const LocaleTimePicker = ({ ariaLabel, onChange, placeholder, value }: Readonly<LocaleTimePickerProps>): JSX.Element => {
  const [panelOpen, setPanelOpen] = useState(false)
  const hourOptions = useMemo(() => buildTimePartOptions(HOUR_COUNT), [])
  const minuteOptions = useMemo(() => buildTimePartOptions(MINUTE_COUNT), [])
  const { hours, minutes } = splitTimeValue(value)
  const hasSelectedTime = isTimeInputValue(value)
  const displayValue = hasSelectedTime ? value : placeholder
  const handleTogglePanel = useCallback(() => {
    setPanelOpen((open) => !open)
  }, [])

  const handleHourChange = useCallback(
    (nextHour: string | null) => {
      if (nextHour === null) {
        return
      }
      onChange(`${nextHour}:${minutes}`)
    },
    [minutes, onChange],
  )

  const handleMinuteChange = useCallback(
    (nextMinute: string | null) => {
      if (nextMinute === null) {
        return
      }
      onChange(`${hours}:${nextMinute}`)
    },
    [hours, onChange],
  )

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        aria-expanded={panelOpen}
        aria-label={ariaLabel}
        className={cn("h-9 w-full justify-start gap-2 px-2.5 font-normal", !hasSelectedTime && "text-muted-foreground")}
        onClick={handleTogglePanel}
      >
        <Clock3 className="size-3.5 shrink-0 opacity-60" strokeWidth={1.5} />
        <span className="truncate font-mono text-xs tabular-nums">{displayValue}</span>
      </Button>

      {panelOpen && (
        <div className="rounded-lg border border-border/60 bg-background p-2">
          <div className="grid grid-cols-2 gap-2">
            <Select items={hourOptions} value={hours} onValueChange={handleHourChange}>
              <SelectTrigger size="sm" className="h-9 w-full font-mono tabular-nums">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hourOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select items={minuteOptions} value={minutes} onValueChange={handleMinuteChange}>
              <SelectTrigger size="sm" className="h-9 w-full font-mono tabular-nums">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {minuteOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  )
}

const HOUR_COUNT = 24

const MINUTE_COUNT = 60

const TIME_PART_WIDTH = 2

const DEFAULT_HOUR = "00"

const DEFAULT_MINUTE = "00"

interface LocaleTimePickerProps {
  readonly ariaLabel: string
  readonly onChange: (time: string) => void
  readonly placeholder: string
  readonly value: string
}
