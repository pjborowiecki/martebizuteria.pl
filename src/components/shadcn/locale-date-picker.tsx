import { type JSX, useCallback, useMemo, useState } from "react";

import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";
import { useFormatter, useLocale } from "use-intl";

import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import { getDayPickerLocale } from "~/src/lib/_utils/day-picker-locale";
import { formatDateToIsoDateLocal, isIsoDateString, parseIsoDateToLocalDate } from "~/src/lib/_utils/iso-date";
import { isValidLocale } from "~/src/lib/_utils/locale";
import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";
import { Calendar } from "~/src/components/shadcn/calendar";

const EMPTY_MATCHER_COUNT = 0;

interface LocaleDatePickerProps {
  readonly ariaLabel: string;
  readonly clearLabel: string;
  readonly max?: string;
  readonly min?: string;
  readonly onChange: (isoDate: string) => void;
  readonly placeholder: string;
  readonly todayIso: string;
  readonly todayLabel: string;
  readonly value: string;
}

function buildDisabledMatchers(min: string | undefined, max: string | undefined): Matcher[] | undefined {
  const matchers: Matcher[] = [];

  if (min !== undefined && isIsoDateString(min)) {
    matchers.push({ before: parseIsoDateToLocalDate(min) });
  }

  if (max !== undefined && isIsoDateString(max)) {
    matchers.push({ after: parseIsoDateToLocalDate(max) });
  }

  return matchers.length > EMPTY_MATCHER_COUNT ? matchers : undefined;
}

/** Locale-aware date field using shadcn `Calendar` (react-day-picker), not the native `type="date"` picker. */
export function LocaleDatePicker({
  ariaLabel,
  clearLabel,
  max,
  min,
  onChange,
  placeholder,
  todayIso,
  todayLabel,
  value
}: Readonly<LocaleDatePickerProps>): JSX.Element {
  const appLocale = useLocale();
  const format = useFormatter();
  const dayPickerLocale = getDayPickerLocale(isValidLocale(appLocale) ? appLocale : DEFAULT_LOCALE);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const hasSelectedDate = value !== "" && isIsoDateString(value);
  const selectedDate = hasSelectedDate ? parseIsoDateToLocalDate(value) : undefined;
  const disabledMatchers = useMemo(() => buildDisabledMatchers(min, max), [max, min]);

  const displayValue = useMemo(() => {
    if (value === "" || !isIsoDateString(value)) {
      return placeholder;
    }

    return format.dateTime(parseIsoDateToLocalDate(value), { dateStyle: "short" });
  }, [format, placeholder, value]);

  const handleSelect = useCallback(
    (date: Date | undefined) => {
      if (date === undefined) {
        return;
      }

      onChange(formatDateToIsoDateLocal(date));
      setCalendarOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange("");
    setCalendarOpen(false);
  }, [onChange]);

  const handleToday = useCallback(() => {
    onChange(todayIso);
    setCalendarOpen(false);
  }, [onChange, todayIso]);

  const toggleCalendar = useCallback(() => {
    setCalendarOpen((open) => !open);
  }, []);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        aria-expanded={calendarOpen}
        aria-label={ariaLabel}
        className={cn("h-9 w-full justify-start gap-2 px-2.5 font-normal", value === "" && "text-muted-foreground")}
        onClick={toggleCalendar}
      >
        <CalendarIcon className="size-3.5 shrink-0 opacity-60" strokeWidth={1.5} />
        <span className="truncate">{displayValue}</span>
      </Button>

      {calendarOpen && (
        <div className="rounded-lg border border-border/60 bg-background p-1">
          <Calendar
            defaultMonth={selectedDate}
            disabled={disabledMatchers}
            locale={dayPickerLocale}
            mode="single"
            onSelect={handleSelect}
            selected={selectedDate}
          />
          <div className="flex items-center justify-between border-t border-border/60 px-1 pt-2">
            <Button type="button" variant="ghost" size="sm" disabled={!hasSelectedDate} onClick={handleClear}>
              {clearLabel}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleToday}>
              {todayLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
