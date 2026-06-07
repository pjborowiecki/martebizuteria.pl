import { isIsoDateString, parseIsoDateToEndMs, parseIsoDateToStartMs } from "~/src/lib/_utils/iso-date";

const ISO_DATE_TIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/u;
const TIME_INPUT_PATTERN = /^\d{2}:\d{2}$/u;
const MONTH_OFFSET = 1;
const END_OF_MINUTE_SECOND = 59;
const END_OF_MINUTE_MILLISECOND = 999;
const START_OF_SECOND_MILLISECOND = 0;
const DEFAULT_TIME = "00:00";
const DEFAULT_END_TIME = "23:59";

export function isTimeInputValue(value: string): boolean {
  return TIME_INPUT_PATTERN.test(value);
}

export function hasIsoDateTimeTimeComponent(value: string): boolean {
  return value.includes("T");
}

export function isIsoDateTimeLocalString(value: string): boolean {
  if (isIsoDateString(value)) {
    return true;
  }

  if (!ISO_DATE_TIME_LOCAL_PATTERN.test(value)) {
    return false;
  }

  return !Number.isNaN(parseIsoDateTimeLocalToMs(value));
}

export function combineIsoDateAndTime(date: string, time: string): string {
  if (date === "") {
    return "";
  }

  if (time === "" || !isTimeInputValue(time)) {
    return date;
  }

  return `${date}T${time}`;
}

export function splitIsoDateTimeLocal(value: string): { readonly date: string; readonly time: string } {
  if (!hasIsoDateTimeTimeComponent(value)) {
    return { date: value, time: DEFAULT_TIME };
  }

  const [date, timePart] = value.split("T");
  const [hours, minutes] = timePart.split(":");
  return { date, time: `${hours}:${minutes}` };
}

export function parseIsoDateTimeLocalToMs(value: string): number {
  if (isIsoDateString(value)) {
    return parseIsoDateToStartMs(value);
  }

  const [datePart, timePart] = value.split("T");
  const [yearPart, monthPart, dayPart] = datePart.split("-");
  const [hoursPart, minutesPart, secondsPart = "0"] = timePart.split(":");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  const seconds = Number(secondsPart);

  return new Date(year, month - MONTH_OFFSET, day, hours, minutes, seconds).getTime();
}

export function parseIsoDateTimeLocalToEndMs(value: string): number {
  if (isIsoDateString(value)) {
    return parseIsoDateToEndMs(value);
  }

  const [datePart, timePart] = value.split("T");
  const [yearPart, monthPart, dayPart] = datePart.split("-");
  const [hoursPart, minutesPart, secondsPart] = timePart.split(":");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  const hasSeconds = secondsPart !== undefined;
  const seconds = hasSeconds ? Number(secondsPart) : END_OF_MINUTE_SECOND;
  const milliseconds = hasSeconds ? START_OF_SECOND_MILLISECOND : END_OF_MINUTE_MILLISECOND;

  return new Date(year, month - MONTH_OFFSET, day, hours, minutes, seconds, milliseconds).getTime();
}

export function defaultDateTimeFilterEndTime(): string {
  return DEFAULT_END_TIME;
}
